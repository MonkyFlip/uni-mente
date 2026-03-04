import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SesionService } from './sesion.service';
import { Sesion } from './sesion.entity';
import { CreateSesionInput } from './dto/create-sesion.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolNombre } from '../common/enums/rol.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolNombre.PSICOLOGO)
@Resolver(() => Sesion)
export class SesionResolver {
  constructor(private readonly sesionService: SesionService) {}

  /** El psicólogo registra la sesión al finalizar la cita */
  @Mutation(() => Sesion)
  async registrarSesion(@Args('input') input: CreateSesionInput): Promise<Sesion> {
    return this.sesionService.create(input);
  }
}
