import { Resolver, Query, ObjectType, Field, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolNombre } from '../common/enums/rol.enum';

// ── DTOs de respuesta ─────────────────────────────────────────────
@ObjectType()
export class CitasPorMes {
  @Field() mes: string;
  @Field(() => Int) total: number;
}

@ObjectType()
export class CitasPorEstado {
  @Field() estado: string;
  @Field(() => Int) total: number;
}

@ObjectType()
export class PsicologoTop {
  @Field() nombre: string;
  @Field(() => Int) total: number;
}

@ObjectType()
export class CarreraTop {
  @Field() carrera: string;
  @Field(() => Int) total: number;
}

@ObjectType()
export class EstadisticasAdmin {
  @Field(() => [CitasPorMes])    citasPorMes:    CitasPorMes[];
  @Field(() => [CitasPorEstado]) citasPorEstado: CitasPorEstado[];
  @Field(() => [PsicologoTop])   psicologosTop:  PsicologoTop[];
  @Field(() => [CarreraTop])     carrerasTop:    CarreraTop[];
  @Field(() => Int)              totalCitas:     number;
  @Field(() => Int)              totalPsicologos:number;
  @Field(() => Int)              totalEstudiantes:number;
}

// ── Resolver ──────────────────────────────────────────────────────
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolNombre.ADMINISTRADOR)
@Resolver()
export class EstadisticasResolver {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Query(() => EstadisticasAdmin)
  async estadisticasAdmin(): Promise<EstadisticasAdmin> {

    // Citas por mes — últimos 6 meses
    const citasPorMes: CitasPorMes[] = await this.ds.query(`
      SELECT
        FORMAT(DATEADD(month, n.num, DATEADD(month, DATEDIFF(month, 0, GETDATE()) - 5, 0)), 'MMM yyyy', 'es-MX') AS mes,
        COUNT(c.id_cita) AS total
      FROM (
        SELECT 0 num UNION SELECT 1 UNION SELECT 2
        UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
      ) n
      LEFT JOIN dbo.Cita c
        ON MONTH(c.fecha) = MONTH(DATEADD(month, n.num, DATEADD(month, DATEDIFF(month, 0, GETDATE()) - 5, 0)))
        AND YEAR(c.fecha)  = YEAR(DATEADD(month, n.num, DATEADD(month, DATEDIFF(month, 0, GETDATE()) - 5, 0)))
      GROUP BY n.num,
        FORMAT(DATEADD(month, n.num, DATEADD(month, DATEDIFF(month, 0, GETDATE()) - 5, 0)), 'MMM yyyy', 'es-MX')
      ORDER BY n.num
    `);

    // Distribución por estado
    const citasPorEstado: CitasPorEstado[] = await this.ds.query(`
      SELECT estado, COUNT(*) AS total
      FROM dbo.Cita
      GROUP BY estado
    `);

    // Top 5 psicólogos más solicitados
    const psicologosTop: PsicologoTop[] = await this.ds.query(`
      SELECT TOP 5
        u.nombre,
        COUNT(c.id_cita) AS total
      FROM dbo.Cita c
      JOIN dbo.Psicologo p ON c.id_psicologo = p.id_psicologo
      JOIN dbo.Usuario u   ON p.id_usuario   = u.id_usuario
      GROUP BY u.nombre
      ORDER BY total DESC
    `);

    // Top 5 carreras con más citas
    const carrerasTop: CarreraTop[] = await this.ds.query(`
      SELECT TOP 5
        e.carrera,
        COUNT(c.id_cita) AS total
      FROM dbo.Cita c
      JOIN dbo.Estudiante e ON c.id_estudiante = e.id_estudiante
      WHERE e.carrera IS NOT NULL AND e.carrera != ''
      GROUP BY e.carrera
      ORDER BY total DESC
    `);

    // Totales globales
    const [[{ totalCitas }], [{ totalPsicologos }], [{ totalEstudiantes }]] = await Promise.all([
      this.ds.query('SELECT COUNT(*) AS totalCitas FROM dbo.Cita'),
      this.ds.query('SELECT COUNT(*) AS totalPsicologos FROM dbo.Psicologo'),
      this.ds.query('SELECT COUNT(*) AS totalEstudiantes FROM dbo.Estudiante'),
    ]);

    return {
      citasPorMes:     citasPorMes.map(r => ({ mes: r.mes, total: Number(r.total) })),
      citasPorEstado:  citasPorEstado.map(r => ({ estado: r.estado, total: Number(r.total) })),
      psicologosTop:   psicologosTop.map(r => ({ nombre: r.nombre, total: Number(r.total) })),
      carrerasTop:     carrerasTop.map(r => ({ carrera: r.carrera, total: Number(r.total) })),
      totalCitas:      Number(totalCitas),
      totalPsicologos: Number(totalPsicologos),
      totalEstudiantes:Number(totalEstudiantes),
    };
  }
}