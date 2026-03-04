import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HorarioPsicologo } from './horario-psicologo.entity';
import { HorarioPsicologoService } from './horario-psicologo.service';
import { HorarioPsicologoResolver } from './horario-psicologo.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([HorarioPsicologo])],
  providers: [HorarioPsicologoService, HorarioPsicologoResolver],
  exports: [HorarioPsicologoService],
})
export class HorarioPsicologoModule {}
