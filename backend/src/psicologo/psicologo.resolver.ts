import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PsicologoService } from './psicologo.service';
import { Psicologo } from './psicologo.entity';
import { CreatePsicologoInput, UpdatePsicologoInput } from './dto/psicologo.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolNombre } from '../common/enums/rol.enum';

@Resolver(() => Psicologo)
export class PsicologoResolver {
  constructor(private readonly service: PsicologoService) {}

  /** Lista publica: solo psicologos activos (para estudiantes buscando cita) */
  @Query(() => [Psicologo])
  psicologos(): Promise<Psicologo[]> {
    return this.service.findAll();
  }

  /** Lista admin: todos los psicologos incluidos inactivos */
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
  @Query(() => [Psicologo])
  psicologosAdmin(): Promise<Psicologo[]> {
    return this.service.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
  @Mutation(() => Psicologo)
  registrarPsicologo(@Args('input') input: CreatePsicologoInput): Promise<Psicologo> {
    return this.service.create(input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
  @Mutation(() => Psicologo)
  actualizarPsicologo(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdatePsicologoInput,
  ): Promise<Psicologo> {
    return this.service.update(id, input);
  }

  /** Activar / desactivar psicologo (eliminacion logica) */
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
  @Mutation(() => Psicologo, { description: 'Activa o desactiva un psicologo (eliminacion logica)' })
  toggleActivoPsicologo(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<Psicologo> {
    return this.service.toggleActivo(id);
  }
}
