import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { MfaService } from './mfa.service';
import { MfaResolver } from './mfa.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  providers: [MfaService, MfaResolver],
  exports: [MfaService],
})
export class MfaModule {}
