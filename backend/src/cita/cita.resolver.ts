import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { CitaService } from './cita.service';
import { Cita } from './cita.entity';
import { CreateCitaInput, UpdateEstadoCitaInput } from './dto/cita.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolNombre } from '../common/enums/rol.enum';
import { EstudianteService } from '../estudiante/estudiante.service';

@UseGuards(JwtAuthGuard)
@Resolver(() => Cita)
export class CitaResolver {
  constructor(
    private readonly citaService: CitaService,
    private readonly estudianteService: EstudianteService,
  ) {}

  /**
   * El estudiante agenda una cita en un horario registrado por el psicólogo.
   * - id_estudiante: resuelto desde el JWT (nunca desde el input)
   * - hora_inicio / hora_fin: tomadas del horario, no del input
   */
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ESTUDIANTE)
  @Mutation(() => Cita)
  async agendarCita(
    @CurrentUser() user: any,
    @Args('input') input: CreateCitaInput,
  ): Promise<Cita> {
    const estudiante = await this.estudianteService.findByUsuario(user.id_usuario);
    if (!estudiante) {
      throw new NotFoundException(
        'Perfil de estudiante no encontrado. Vuelve a iniciar sesión.',
      );
    }
    return this.citaService.create(estudiante.id_estudiante, input);
  }

  /** El psicólogo o admin ve la agenda de un psicólogo */
  @UseGuards(RolesGuard)
  @Roles(RolNombre.PSICOLOGO, RolNombre.ADMINISTRADOR)
  @Query(() => [Cita], { name: 'agendaPsicologo' })
  async agendaPsicologo(
    @Args('id_psicologo', { type: () => Int }) id: number,
  ): Promise<Cita[]> {
    return this.citaService.findByPsicologo(id);
  }

  /** El estudiante ve sus citas */
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ESTUDIANTE, RolNombre.ADMINISTRADOR)
  @Query(() => [Cita], { name: 'citasEstudiante' })
  async citasEstudiante(
    @Args('id_estudiante', { type: () => Int }) id: number,
  ): Promise<Cita[]> {
    return this.citaService.findByEstudiante(id);
  }

  /** Cambiar estado — psicólogo/admin: asistida o cancelada; estudiante: solo cancelar */
  @UseGuards(RolesGuard)
  @Roles(RolNombre.PSICOLOGO, RolNombre.ADMINISTRADOR, RolNombre.ESTUDIANTE)
  @Mutation(() => Cita)
  async cambiarEstadoCita(
    @Args('id_cita', { type: () => Int }) id: number,
    @Args('input') input: UpdateEstadoCitaInput,
  ): Promise<Cita> {
    return this.citaService.updateEstado(id, input);
  }
}
