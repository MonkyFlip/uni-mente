import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginInput, AuthPayload } from './dto/login.input';
import { Usuario } from '../usuario/usuario.entity';
import { Estudiante } from '../estudiante/estudiante.entity';
import { Psicologo } from '../psicologo/psicologo.entity';
import { RolNombre } from '../common/enums/rol.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)    private readonly usuarioRepo:    Repository<Usuario>,
    @InjectRepository(Estudiante) private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(Psicologo)  private readonly psicologoRepo:  Repository<Psicologo>,
    private readonly jwtService: JwtService,
  ) {}

  async login(input: LoginInput): Promise<AuthPayload> {
    const user = await this.usuarioRepo.findOne({
      where: { correo: input.correo },
      relations: ['rol'],
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas.');

    const valid = await bcrypt.compare(input.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas.');

    const token = this.jwtService.sign({ sub: user.id_usuario });

    let id_perfil: number | undefined;
    const rol = user.rol.nombre as RolNombre;

    if (rol === RolNombre.ESTUDIANTE) {
      const est = await this.estudianteRepo.findOneBy({ id_usuario: user.id_usuario });
      id_perfil = est?.id_estudiante;
    } else if (rol === RolNombre.PSICOLOGO) {
      const psi = await this.psicologoRepo.findOneBy({ id_usuario: user.id_usuario });
      id_perfil = psi?.id_psicologo;
    }

    return {
      access_token: token,
      rol,
      nombre: user.nombre,
      correo: user.correo,
      id_perfil,
    };
  }
}
