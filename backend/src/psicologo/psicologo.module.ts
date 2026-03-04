import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Psicologo } from './psicologo.entity';
import { PsicologoService } from './psicologo.service';
import { PsicologoResolver } from './psicologo.resolver';
import { Usuario } from '../usuario/usuario.entity';
import { Rol } from '../rol/rol.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Psicologo, Usuario, Rol])],
  providers: [PsicologoService, PsicologoResolver],
  exports: [PsicologoService],
})
export class PsicologoModule {}
