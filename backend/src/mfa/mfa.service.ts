/**
 * mfa.service.ts
 * OWASP A02: TOTP window:2 (tolerancia ±60s), bcrypt 12 rounds.
 * OWASP A07: Limpieza de codigo antes de verificar (espacios, no-digits).
 */
import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuario/usuario.entity';
import { SetupMfaPayload, CambiarPasswordInput } from './dto/mfa.dto';

@Injectable()
export class MfaService {
  constructor(@InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>) {}

  async setupMfa(id_usuario: number): Promise<SetupMfaPayload> {
    const u = await this.findUsuario(id_usuario);
    const secret = speakeasy.generateSecret({ name: `UniMente:${u.correo}`, issuer: 'UniMente', length: 20 });
    await this.usuarioRepo.update(id_usuario, { mfa_secret: secret.base32, mfa_enabled: false } as any);
    return { qr_code: await QRCode.toDataURL(secret.otpauth_url!), secret: secret.base32 };
  }

  async habilitarMfa(id_usuario: number, codigo: string): Promise<boolean> {
    const u = await this.findUsuario(id_usuario);
    if (!u.mfa_secret) throw new BadRequestException('Primero configura MFA con setupMfa.');
    if (!this.verifyCode(u.mfa_secret, codigo)) throw new UnauthorizedException('Codigo MFA invalido.');
    await this.usuarioRepo.update(id_usuario, { mfa_enabled: true } as any);
    return true;
  }

  async deshabilitarMfa(id_usuario: number, codigo: string): Promise<boolean> {
    const u = await this.findUsuario(id_usuario);
    if (!Number(u.mfa_enabled)) throw new BadRequestException('MFA ya esta deshabilitado.');
    if (!this.verifyCode(u.mfa_secret!, codigo)) throw new UnauthorizedException('Codigo MFA invalido.');
    await this.usuarioRepo.update(id_usuario, { mfa_enabled: false, mfa_secret: null } as any);
    return true;
  }

  async requireMfa(id_usuario: number, codigo?: string): Promise<void> {
    const u = await this.findUsuario(id_usuario);
    if (!Number(u.mfa_enabled)) return;
    if (!codigo) throw new UnauthorizedException('Esta operacion requiere un codigo MFA.');
    if (!this.verifyCode(u.mfa_secret!, codigo)) throw new UnauthorizedException('Codigo MFA invalido o expirado.');
  }

  async verificarCodigo(id_usuario: number, codigo: string): Promise<boolean> {
    const u = await this.findUsuario(id_usuario);
    if (!u.mfa_secret) return false;
    return this.verifyCode(u.mfa_secret, codigo);
  }

  async cambiarPassword(id_usuario: number, input: CambiarPasswordInput): Promise<boolean> {
    const u = await this.findUsuario(id_usuario);
    if (!await bcrypt.compare(input.password_actual, u.password_hash))
      throw new UnauthorizedException('La contrasena actual es incorrecta.');
    if (Number(u.mfa_enabled)) {
      if (!input.codigo_mfa) throw new UnauthorizedException('Tu cuenta tiene MFA activo. Incluye el codigo de 6 digitos.');
      if (!this.verifyCode(u.mfa_secret!, input.codigo_mfa)) throw new UnauthorizedException('Codigo MFA invalido.');
    }
    await this.usuarioRepo.update(id_usuario, { password_hash: await bcrypt.hash(input.password_nuevo, 12) } as any);
    return true;
  }

  async obtenerEstadoMfa(id_usuario: number): Promise<{ mfa_enabled: boolean }> {
    const u = await this.findUsuario(id_usuario);
    return { mfa_enabled: !!Number(u.mfa_enabled) };
  }

  private async findUsuario(id_usuario: number): Promise<Usuario> {
    const u = await this.usuarioRepo.findOneBy({ id_usuario });
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    return u;
  }

  /** window:2 = ±60s. Limpia no-dígitos antes de verificar. */
  verifyCode(secret: string, codigo: string): boolean {
    const token = codigo.replace(/\s/g, '').replace(/\D/g, '');
    if (token.length !== 6) return false;
    return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 2 });
  }
}
