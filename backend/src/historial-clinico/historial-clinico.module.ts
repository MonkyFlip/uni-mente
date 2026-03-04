import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialClinico } from './historial-clinico.entity';
import { HistorialClinicoService } from './historial-clinico.service';
import { HistorialClinicoResolver } from './historial-clinico.resolver';
import { PsicologoModule } from '../psicologo/psicologo.module';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialClinico]), PsicologoModule],
  providers: [HistorialClinicoService, HistorialClinicoResolver],
  exports: [HistorialClinicoService],
})
export class HistorialClinicoModule {}
