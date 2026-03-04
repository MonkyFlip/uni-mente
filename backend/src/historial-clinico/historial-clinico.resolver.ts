import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { HistorialClinicoService } from './historial-clinico.service';
import { HistorialClinico } from './historial-clinico.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolNombre } from '../common/enums/rol.enum';
import { PsicologoService } from '../psicologo/psicologo.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolNombre.PSICOLOGO, RolNombre.ADMINISTRADOR)   // RF: confidencialidad
@Resolver(() => HistorialClinico)
export class HistorialClinicoResolver {
  constructor(
    private readonly historialService: HistorialClinicoService,
    private readonly psicologoService: PsicologoService,
  ) {}

  @Query(() => [HistorialClinico], { name: 'expedienteEstudiante' })
  async expedienteEstudiante(
    @Args('id_estudiante', { type: () => Int }) id_estudiante: number,
    @CurrentUser() user: any,
  ): Promise<HistorialClinico[]> {
    const isAdmin = user.rol.nombre === RolNombre.ADMINISTRADOR;
    let id_psicologo: number | undefined;
    if (!isAdmin) {
      const psi = await this.psicologoService.findByUsuario(user.id_usuario);
      id_psicologo = psi?.id_psicologo;
    }
    return this.historialService.findByEstudiante(id_estudiante, {
      id_psicologo,
      isAdmin,
    });
  }

  @Query(() => HistorialClinico, { name: 'historial' })
  async findOne(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<HistorialClinico> {
    return this.historialService.findOne(id);
  }
}
