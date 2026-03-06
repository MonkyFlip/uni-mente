import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { HorarioPsicologoService } from './horario-psicologo.service';
import { HorarioPsicologo } from './horario-psicologo.entity';
import { CreateHorarioInput, UpdateHorarioInput } from './dto/horario.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolNombre } from '../common/enums/rol.enum';
import { PsicologoService } from '../psicologo/psicologo.service';

@UseGuards(JwtAuthGuard)
@Resolver(() => HorarioPsicologo)
export class HorarioPsicologoResolver {
  constructor(
    private readonly service: HorarioPsicologoService,
    private readonly psicologoService: PsicologoService,
  ) {}

  /**
   * El id_psicologo se obtiene del JWT del usuario autenticado,
   * nunca del input del frontend — evita el error de FK con valor 0.
   */
  @UseGuards(RolesGuard)
  @Roles(RolNombre.PSICOLOGO, RolNombre.ADMINISTRADOR)
  @Mutation(() => HorarioPsicologo)
  async crearHorario(
    @CurrentUser() user: any,
    @Args('input') input: CreateHorarioInput,
  ): Promise<HorarioPsicologo> {
    const psicologo = await this.psicologoService.findByUsuario(user.id_usuario);
    if (!psicologo) {
      throw new NotFoundException('Perfil de psicólogo no encontrado para este usuario.');
    }
    return this.service.create({ ...input, id_psicologo: psicologo.id_psicologo });
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
