import {
  Injectable, NotFoundException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuario/usuario.entity';
import { SetupMfaPayload, CambiarPasswordInput } from './dto/mfa.dto';

@Injectable()
export class MfaService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  // ─── Setup ────────────────────────────────────────────────────────

  /**
   * Genera un secreto TOTP y el QR correspondiente para el usuario.
   * El secreto se guarda en la BD pero MFA NO se activa aún.
   * El usuario debe verificar el primer código antes de activarlo.
   */
  async setupMfa(id_usuario: number): Promise<SetupMfaPayload> {
    const usuario = await this.findUsuario(id_usuario);

    const secret = speakeasy.generateSecret({
      name:   `UniMente:${usuario.correo}`,
      issuer: 'UniMente',
      length: 20,
    });

    // Guardar secreto (sin activar aún)
    await this.usuarioRepo.update(id_usuario, {
      mfa_secret:  secret.base32,
      mfa_enabled: false,
    } as any);

    const qr_code = await QRCode.toDataURL(secret.otpauth_url!);

    return { qr_code, secret: secret.base32 };
  }

  /**
   * Activa MFA después de que el usuario verificó el primer código con la app.
   */
  async habilitarMfa(id_usuario: number, codigo: string): Promise<boolean> {
    const usuario = await this.findUsuario(id_usuario);

    if (!usuario.mfa_secret) {
      throw new BadRequestException('Primero debes configurar MFA con setupMfa.');
    }
    if (!this.verifyCode(usuario.mfa_secret, codigo)) {
      throw new UnauthorizedException('Código MFA inválido. Verifica que la hora de tu dispositivo sea correcta.');
    }

    await this.usuarioRepo.update(id_usuario, { mfa_enabled: true } as any);
    return true;
  }

  /**
   * Desactiva MFA. Requiere un código válido para evitar bloqueos accidentales.
   */
  async deshabilitarMfa(id_usuario: number, codigo: string): Promise<boolean> {
    const usuario = await this.findUsuario(id_usuario);

    if (Number(usuario.mfa_enabled) !== 1 || !usuario.mfa_secret) {
      throw new BadRequestException('MFA ya está deshabilitado en esta cuenta.');
    }
    if (!this.verifyCode(usuario.mfa_secret!, codigo)) {
      throw new UnauthorizedException('Código MFA inválido.');
    }

    await this.usuarioRepo.update(id_usuario, {
      mfa_enabled: false,
      mfa_secret:  null,
    } as any);
    return true;
  }

  // ─── Verificación ─────────────────────────────────────────────────

  /**
   * Verifica un código MFA para el usuario dado.
   * MFA es OBLIGATORIO para operaciones sensibles (respaldos, restauraciones).
   * Si la cuenta no tiene MFA configurado, la operación es rechazada.
   */
  async requireMfa(id_usuario: number, codigo?: string): Promise<void> {
    const usuario = await this.findUsuario(id_usuario);

    // MySQL TINYINT puede devolver 0/1 en lugar de false/true
    const mfaActivo = Number(usuario.mfa_enabled) === 1 && !!usuario.mfa_secret;

    // MFA no configurado — la operación no puede completarse
    if (!mfaActivo) {
      throw new UnauthorizedException(
        'Debes configurar MFA antes de realizar respaldos o restauraciones. ' +
        'Ve a Seguridad MFA y activa la autenticación de dos factores.',
      );
    }

    // MFA activo — validar código
    const codigoLimpio = (codigo ?? '').trim().replace(/\s/g, '');

    if (!codigoLimpio || codigoLimpio.length !== 6) {
      throw new UnauthorizedException(
        'Ingresa el código de 6 dígitos de tu app autenticadora (Google Authenticator o Microsoft Authenticator).',
      );
    }

    if (!this.verifyCode(usuario.mfa_secret!, codigoLimpio)) {
      throw new UnauthorizedException(
        'Código MFA incorrecto o expirado. Los códigos cambian cada 30 segundos — intenta de nuevo.',
      );
    }
  }

  /** Verificación pública (para que el resolver lo llame directamente) */
  async verificarCodigo(id_usuario: number, codigo: string): Promise<boolean> {
    const usuario = await this.findUsuario(id_usuario);
    if (!usuario.mfa_secret) return false;
    return this.verifyCode(usuario.mfa_secret, codigo);
  }

  // ─── Cambio de contraseña ─────────────────────────────────────────

  async cambiarPassword(id_usuario: number, input: CambiarPasswordInput): Promise<boolean> {
    const usuario = await this.findUsuario(id_usuario);

    // 1. Verificar contraseña actual
    const passwordValida = await bcrypt.compare(input.password_actual, usuario.password_hash);
    if (!passwordValida) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    // 2. Verificar MFA si está habilitado
    if (Number(usuario.mfa_enabled) === 1 && usuario.mfa_secret) {
      if (!input.codigo_mfa) {
        throw new UnauthorizedException('Tu cuenta tiene MFA activo. Incluye el código de 6 dígitos.');
      }
      if (!this.verifyCode(usuario.mfa_secret!, input.codigo_mfa)) {
        throw new UnauthorizedException('Código MFA inválido.');
      }
    }

    // 3. Guardar nueva contraseña
    const nuevo_hash = await bcrypt.hash(input.password_nuevo, 10);
    await this.usuarioRepo.update(id_usuario, { password_hash: nuevo_hash } as any);
    return true;
  }

  // ─── Estado de MFA ────────────────────────────────────────────────

  async obtenerEstadoMfa(id_usuario: number): Promise<{ mfa_enabled: boolean }> {
    const u = await this.findUsuario(id_usuario);
    return { mfa_enabled: Number(u.mfa_enabled) === 1 };
  }

  // ─── Helpers privados ─────────────────────────────────────────────

  private async findUsuario(id_usuario: number): Promise<Usuario> {
    const u = await this.usuarioRepo.findOneBy({ id_usuario });
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    return u;
  }

  /** TOTP verify con ventana de ±30 s */
  verifyCode(secret: string, codigo: string): boolean {
    const token = codigo.replace(/\s/g, '').replace(/\D/g, '');
    if (token.length !== 6) return false;
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window:   2,   // tolerancia de ±60 s para desfase de reloj
    });
  }
}