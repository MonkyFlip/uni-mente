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
  constructor(private readonly estudianteService: EstudianteService) {}

  /** Registro público: cualquier persona puede crear una cuenta estudiante */
  @Mutation(() => Estudiante)
  async registrarEstudiante(
    @Args('input') input: CreateEstudianteInput,
  ): Promise<Estudiante | null> {
    return this.estudianteService.create(input);
  }

  /** Solo admin/psicólogo pueden listar estudiantes */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolNombre.ADMINISTRADOR, RolNombre.PSICOLOGO)
  @Query(() => [Estudiante], { name: 'estudiantes' })
  async findAll(): Promise<Estudiante[]> {
    return this.estudianteService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolNombre.ADMINISTRADOR, RolNombre.PSICOLOGO)
  @Query(() => Estudiante, { name: 'estudiante' })
  async findOne(@Args('id', { type: () => Int }) id: number): Promise<Estudiante | null> {
    return this.estudianteService.findOne(id);
  }
}
