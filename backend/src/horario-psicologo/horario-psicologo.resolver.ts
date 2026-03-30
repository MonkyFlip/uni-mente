import { Resolver, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { HorarioPsicologoService } from './horario-psicologo.service';
import { HorarioPsicologo } from './horario-psicologo.entity';
import { CreateHorarioInput } from './dto/horario.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolNombre } from '../common/enums/rol.enum';
@UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.PSICOLOGO)
@Resolver(() => HorarioPsicologo)
export class HorarioPsicologoResolver {
  constructor(private readonly service: HorarioPsicologoService) {}
  @Mutation(() => HorarioPsicologo)
  crearHorario(@CurrentUser() user: any, @Args('input') input: CreateHorarioInput): Promise<HorarioPsicologo> { return this.service.create(user.id_perfil, input); }
  @Mutation(() => Boolean)
  eliminarHorario(@CurrentUser() user: any, @Args('id', { type: () => Int }) id: number): Promise<boolean> { return this.service.remove(id, user.id_perfil); }
}
