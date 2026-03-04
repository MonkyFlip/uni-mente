import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from './cita.entity';
import { CitaService } from './cita.service';
import { CitaResolver } from './cita.resolver';
import { EstudianteModule } from '../estudiante/estudiante.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cita]), EstudianteModule],
  providers: [CitaService, CitaResolver],
  exports: [CitaService],
})
export class CitaModule {}
