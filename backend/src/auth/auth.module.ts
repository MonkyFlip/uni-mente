import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Usuario } from '../usuario/usuario.entity';
import { Estudiante } from '../estudiante/estudiante.entity';
import { Psicologo } from '../psicologo/psicologo.entity';
@Module({
  imports: [
    ConfigModule, PassportModule,
    JwtModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (cfg: ConfigService) => ({
      secret: cfg.get('JWT_SECRET', 'change_me'),
      signOptions: { expiresIn: cfg.get('JWT_EXPIRES', '8h') },
    }) }),
    TypeOrmModule.forFeature([Usuario, Estudiante, Psicologo]),
  ],
  providers: [AuthService, AuthResolver, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
