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
  @Query(() => [Psicologo]) psicologos(): Promise<Psicologo[]> { return this.service.findAll(); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
  @Mutation(() => Psicologo)
  registrarPsicologo(@Args('input') input: CreatePsicologoInput): Promise<Psicologo> { return this.service.create(input); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
  @Mutation(() => Psicologo)
  actualizarPsicologo(@Args('id', { type: () => Int }) id: number, @Args('input') input: UpdatePsicologoInput): Promise<Psicologo> { return this.service.update(id, input); }
}
