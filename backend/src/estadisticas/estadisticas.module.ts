import { Module } from '@nestjs/common';
import { EstadisticasResolver } from './estadisticas.resolver';

@Module({
  providers: [EstadisticasResolver],
})
export class EstadisticasModule {}