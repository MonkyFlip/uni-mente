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
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'unimente_secret'),
        signOptions: { expiresIn: '8h' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Usuario, Estudiante, Psicologo]),
  ],
  providers: [AuthService, AuthResolver, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
