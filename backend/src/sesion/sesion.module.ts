import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sesion } from './sesion.entity';
import { SesionService } from './sesion.service';
import { SesionResolver } from './sesion.resolver';
import { CitaModule } from '../cita/cita.module';
import { HistorialClinico } from '../historial-clinico/historial-clinico.entity';
import { DetalleHistorial } from '../detalle-historial/detalle-historial.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sesion, HistorialClinico, DetalleHistorial]),
    CitaModule,
  ],
  providers: [SesionService, SesionResolver],
  exports: [SesionService],
})
export class SesionModule {}
