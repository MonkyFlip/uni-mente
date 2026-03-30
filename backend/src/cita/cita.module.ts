import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from './cita.entity';
import { HorarioPsicologo } from '../horario-psicologo/horario-psicologo.entity';
import { CitaService } from './cita.service';
import { CitaResolver } from './cita.resolver';
@Module({
  imports: [TypeOrmModule.forFeature([Cita, HorarioPsicologo])],
  providers: [CitaService, CitaResolver],
  exports: [CitaService, TypeOrmModule],
})
export class CitaModule {}
