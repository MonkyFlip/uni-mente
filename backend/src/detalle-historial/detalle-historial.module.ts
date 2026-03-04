import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetalleHistorial } from './detalle-historial.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DetalleHistorial])],
  exports: [TypeOrmModule],
})
export class DetalleHistorialModule {}
