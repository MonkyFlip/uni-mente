import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { HistorialClinicoService } from './historial-clinico.service';
import { HistorialClinico } from './historial-clinico.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
@UseGuards(JwtAuthGuard)
@Resolver(() => HistorialClinico)
export class HistorialClinicoResolver {
  constructor(private readonly service: HistorialClinicoService) {}
  @Query(() => [HistorialClinico])
  expedienteEstudiante(@Args('id_estudiante', { type: () => Int }) id: number): Promise<HistorialClinico[]> { return this.service.expedienteEstudiante(id); }
}
