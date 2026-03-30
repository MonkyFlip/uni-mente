/**
 * auth.service.ts
 * OWASP A07: bcrypt compare, JWT con expiración, no revelar si correo existe.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuario/usuario.entity';
import { Estudiante } from '../estudiante/estudiante.entity';
import { Psicologo } from '../psicologo/psicologo.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)    private readonly usuarioRepo:    Repository<Usuario>,
    @InjectRepository(Estudiante) private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(Psicologo)  private readonly psicologoRepo:  Repository<Psicologo>,
    private readonly jwtService: JwtService,
  ) {}

  async login(correo: string, password: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { correo }, relations: ['rol_obj'] });
    // A07: mismo mensaje para correo inválido y password incorrecto (no enumerar usuarios)
    if (!usuario || !await bcrypt.compare(password, usuario.password_hash))
      throw new UnauthorizedException('Credenciales invalidas.');

    const rol = usuario.rol_obj?.nombre ?? '';
    let id_perfil: number | null = null;
    if (rol === 'estudiante') {
      const e = await this.estudianteRepo.findOneBy({ id_usuario: usuario.id_usuario });
      id_perfil = e?.id_estudiante ?? null;
    } else if (rol === 'psicologo') {
      const p = await this.psicologoRepo.findOneBy({ id_usuario: usuario.id_usuario });
      id_perfil = p?.id_psicologo ?? null;
    }
    const payload = { id_usuario: usuario.id_usuario, correo: usuario.correo, rol, id_perfil };
    return { access_token: this.jwtService.sign(payload), rol, nombre: usuario.nombre, correo: usuario.correo, id_perfil };
  }
}
