import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PsicologoService } from './psicologo.service';
import { Psicologo } from './psicologo.entity';
import { CreatePsicologoInput, UpdatePsicologoInput } from './dto/psicologo.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolNombre } from '../common/enums/rol.enum';

@Resolver(() => Psicologo)
export class PsicologoResolver {
  constructor(private readonly psicologoService: PsicologoService) {}

  /** Solo admin puede registrar psicólogos */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolNombre.ADMINISTRADOR)
  @Mutation(() => Psicologo)
  async registrarPsicologo(
    @Args('input') input: CreatePsicologoInput,
  ): Promise<Psicologo | null> {
    return this.psicologoService.create(input);
  }

  /** Todos los usuarios autenticados pueden ver la lista de psicólogos */
  @UseGuards(JwtAuthGuard)
  @Query(() => [Psicologo], { name: 'psicologos' })
  async findAll(): Promise<Psicologo[]> {
    return this.psicologoService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => Psicologo, { name: 'psicologo' })
  async findOne(@Args('id', { type: () => Int }) id: number): Promise<Psicologo | null> {
    return this.psicologoService.findOne(id);
  }

  /** El psicólogo actualiza su propio perfil */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolNombre.PSICOLOGO, RolNombre.ADMINISTRADOR)
  @Mutation(() => Psicologo)
  async actualizarPsicologo(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdatePsicologoInput,
  ): Promise<Psicologo | null> {
    return this.psicologoService.update(id, input);
  }
}
