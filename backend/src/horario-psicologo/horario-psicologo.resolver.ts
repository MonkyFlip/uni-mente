import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { HorarioPsicologoService } from './horario-psicologo.service';
import { HorarioPsicologo } from './horario-psicologo.entity';
import { CreateHorarioInput, UpdateHorarioInput } from './dto/horario.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolNombre } from '../common/enums/rol.enum';

@UseGuards(JwtAuthGuard)
@Resolver(() => HorarioPsicologo)
export class HorarioPsicologoResolver {
  constructor(private readonly service: HorarioPsicologoService) {}

  @UseGuards(RolesGuard)
  @Roles(RolNombre.PSICOLOGO, RolNombre.ADMINISTRADOR)
  @Mutation(() => HorarioPsicologo)
  async crearHorario(@Args('input') input: CreateHorarioInput): Promise<HorarioPsicologo> {
    return this.service.create(input);
  }

  @Query(() => [HorarioPsicologo], { name: 'horariosDisponibles' })
  async findByPsicologo(
    @Args('id_psicologo', { type: () => Int }) id: number,
  ): Promise<HorarioPsicologo[]> {
    return this.service.findByPsicologo(id);
  }

  @UseGuards(RolesGuard)
  @Roles(RolNombre.PSICOLOGO, RolNombre.ADMINISTRADOR)
  @Mutation(() => HorarioPsicologo)
  async actualizarHorario(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateHorarioInput,
  ): Promise<HorarioPsicologo> {
    return this.service.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles(RolNombre.PSICOLOGO, RolNombre.ADMINISTRADOR)
  @Mutation(() => Boolean)
  async eliminarHorario(@Args('id', { type: () => Int }) id: number): Promise<boolean> {
    return this.service.remove(id);
  }
}
