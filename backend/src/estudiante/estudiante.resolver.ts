import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
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
  @Mutation(() => Estudiante)
  registrarEstudiante(@Args('input') input: CreateEstudianteInput): Promise<Estudiante> { return this.service.create(input); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
  @Query(() => [Estudiante]) estudiantes(): Promise<Estudiante[]> { return this.service.findAll(); }
}
