import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { HistorialClinicoService } from './historial-clinico.service';
import { HistorialClinico } from './historial-clinico.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolNombre } from '../common/enums/rol.enum';

@UseGuards(JwtAuthGuard)
@Resolver(() => HistorialClinico)
export class HistorialClinicoResolver {
  constructor(private readonly service: HistorialClinicoService) {}

  /**
   * Expediente de un estudiante especifico.
   * Accesible por psicologo (ve su propio historial con ese estudiante)
   * y por administrador.
   */
  @Query(() => [HistorialClinico])
  expedienteEstudiante(
    @Args('id_estudiante', { type: () => Int }) id_estudiante: number,
  ): Promise<HistorialClinico[]> {
    return this.service.expedienteEstudiante(id_estudiante);
  }

  /**
   * Todos los pacientes del psicologo autenticado.
   * id_psicologo se extrae del JWT — nunca del cliente.
   */
  @UseGuards(RolesGuard) @Roles(RolNombre.PSICOLOGO)
  @Query(() => [HistorialClinico], {
    description: 'Lista todos los pacientes del psicologo autenticado con sus sesiones',
  })
  misPacientes(@CurrentUser() user: any): Promise<HistorialClinico[]> {
    return this.service.porPsicologo(user.id_perfil);
  }
}
