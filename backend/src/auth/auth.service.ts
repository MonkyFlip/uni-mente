import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginInput, AuthPayload } from './dto/login.input';
import { Usuario } from '../usuario/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
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
    return {
      access_token: token,
      rol: user.rol.nombre,
      nombre: user.nombre,
    };
  }
}
