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

    if (!usuario.mfa_enabled) {
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
   * Lanza UnauthorizedException si el código es incorrecto.
   */
  async requireMfa(id_usuario: number, codigo?: string): Promise<void> {
    const usuario = await this.findUsuario(id_usuario);
    if (!usuario.mfa_enabled) return; // MFA no activo, no se requiere

    if (!codigo) {
      throw new UnauthorizedException('Esta operación requiere un código MFA.');
    }
    if (!this.verifyCode(usuario.mfa_secret!, codigo)) {
      throw new UnauthorizedException('Código MFA inválido o expirado.');
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
    if (usuario.mfa_enabled) {
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
    return { mfa_enabled: u.mfa_enabled ?? false };
  }

  // ─── Helpers privados ─────────────────────────────────────────────

  private async findUsuario(id_usuario: number): Promise<Usuario> {
    const u = await this.usuarioRepo.findOneBy({ id_usuario });
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    return u;
  }

  /** TOTP verify con ventana de ±30 s */
  verifyCode(secret: string, codigo: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token:    codigo.replace(/\s/g, ''),
      window:   1,
    });
  }
}
