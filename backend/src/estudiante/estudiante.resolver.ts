import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { EstudianteService } from './estudiante.service';
import { Estudiante } from './estudiante.entity';
import { CreateEstudianteInput } from './dto/create-estudiante.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolNombre } from '../common/enums/rol.enum';

@Resolver(() => Estudiante)
export class EstudianteResolver {
  constructor(private readonly service: EstudianteService) {}

  /** Registro publico (sin token) */
  @Mutation(() => Estudiante)
  registrarEstudiante(@Args('input') input: CreateEstudianteInput): Promise<Estudiante> {
    return this.service.create(input);
  }

  /** Solo estudiantes activos */
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
  @Query(() => [Estudiante])
  estudiantes(): Promise<Estudiante[]> {
    return this.service.findAll();
  }

  /** Todos los estudiantes (activos + inactivos) — para panel admin */
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
  @Query(() => [Estudiante])
  estudiantesAdmin(): Promise<Estudiante[]> {
    return this.service.findAllAdmin();
  }

  /** Activar / desactivar estudiante (eliminacion logica) */
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
  @Mutation(() => Estudiante, { description: 'Activa o desactiva un estudiante (eliminacion logica)' })
  toggleActivoEstudiante(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<Estudiante> {
    return this.service.toggleActivo(id);
  }
}
