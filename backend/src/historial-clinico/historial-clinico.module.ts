import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialClinico } from './historial-clinico.entity';
import { HistorialClinicoService } from './historial-clinico.service';
import { HistorialClinicoResolver } from './historial-clinico.resolver';
@Module({
  imports: [TypeOrmModule.forFeature([HistorialClinico])],
  providers: [HistorialClinicoService, HistorialClinicoResolver],
  exports: [TypeOrmModule],
})
export class HistorialClinicoModule {}
