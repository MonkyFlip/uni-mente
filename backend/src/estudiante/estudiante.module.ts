import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estudiante } from './estudiante.entity';
import { EstudianteService } from './estudiante.service';
import { EstudianteResolver } from './estudiante.resolver';
import { Usuario } from '../usuario/usuario.entity';
import { Rol } from '../rol/rol.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Estudiante, Usuario, Rol])],
  providers: [EstudianteService, EstudianteResolver],
  exports: [EstudianteService],
})
export class EstudianteModule {}
