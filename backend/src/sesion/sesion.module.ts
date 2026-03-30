import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sesion } from './sesion.entity';
import { Cita } from '../cita/cita.entity';
import { HistorialClinico } from '../historial-clinico/historial-clinico.entity';
import { DetalleHistorial } from '../detalle-historial/detalle-historial.entity';
import { SesionService } from './sesion.service';
import { SesionResolver } from './sesion.resolver';
@Module({
  imports: [TypeOrmModule.forFeature([Sesion, Cita, HistorialClinico, DetalleHistorial])],
  providers: [SesionService, SesionResolver],
  exports: [SesionService],
})
export class SesionModule {}
