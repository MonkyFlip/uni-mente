import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CitaService } from './cita.service';
import { Cita } from './cita.entity';
import { CreateCitaInput, UpdateEstadoCitaInput } from './dto/cita.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolNombre } from '../common/enums/rol.enum';
@UseGuards(JwtAuthGuard)
@Resolver(() => Cita)
export class CitaResolver {
  constructor(private readonly service: CitaService) {}
  @UseGuards(RolesGuard) @Roles(RolNombre.ESTUDIANTE)
  @Mutation(() => Cita)
  agendarCita(@CurrentUser() user: any, @Args('input') input: CreateCitaInput): Promise<Cita> { return this.service.crear(user.id_perfil, input); }
  @Mutation(() => Cita)
  cambiarEstadoCita(@CurrentUser() user: any, @Args('id_cita', { type: () => Int }) id_cita: number, @Args('input') input: UpdateEstadoCitaInput): Promise<Cita> { return this.service.cambiarEstado(id_cita, input, user); }
  @Query(() => [Cita])
  citasEstudiante(@Args('id_estudiante', { type: () => Int }) id_estudiante: number): Promise<Cita[]> { return this.service.citasEstudiante(id_estudiante); }
  @Query(() => [Cita])
  agendaPsicologo(@Args('id_psicologo', { type: () => Int }) id_psicologo: number): Promise<Cita[]> { return this.service.agendaPsicologo(id_psicologo); }

  // JWT-resolved queries — no id parameter needed
  @UseGuards(RolesGuard) @Roles(RolNombre.ESTUDIANTE)
  @Query(() => [Cita], { name: 'misCitas' })
  misCitas(@CurrentUser() user: any): Promise<Cita[]> { return this.service.citasEstudiante(user.id_perfil); }

  @UseGuards(RolesGuard) @Roles(RolNombre.PSICOLOGO)
  @Query(() => [Cita], { name: 'miAgenda' })
  miAgenda(@CurrentUser() user: any): Promise<Cita[]> { return this.service.agendaPsicologo(user.id_perfil); }
}