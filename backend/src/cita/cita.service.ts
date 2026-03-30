/**
 * cita.service.ts
 * OWASP A01: IDs de cita verificados contra el usuario autenticado (nunca del cliente).
 * OWASP A03: Queries parametrizadas con TypeORM DataSource.
 */
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cita } from './cita.entity';
import { HorarioPsicologo } from '../horario-psicologo/horario-psicologo.entity';
import { CreateCitaInput, UpdateEstadoCitaInput } from './dto/cita.input';
import { RolNombre } from '../common/enums/rol.enum';
@Injectable()
export class CitaService {
  constructor(
    @InjectRepository(Cita) private readonly repo: Repository<Cita>,
    @InjectRepository(HorarioPsicologo) private readonly horarioRepo: Repository<HorarioPsicologo>,
    private readonly dataSource: DataSource,
  ) {}
  async crear(id_estudiante: number, input: CreateCitaInput): Promise<Cita> {
    const horario = await this.horarioRepo.findOneBy({ id_horario: input.id_horario, id_psicologo: input.id_psicologo });
    if (!horario) throw new NotFoundException('Horario no encontrado.');
    const cita = this.repo.create({ id_estudiante, id_psicologo: input.id_psicologo, fecha: input.fecha, hora_inicio: horario.hora_inicio, hora_fin: horario.hora_fin, estado: 'PENDIENTE', motivo: input.motivo });
    const saved = await this.repo.save(cita);
    return this.repo.findOne({ where: { id_cita: saved.id_cita }, relations: ['estudiante','psicologo','sesion','estudiante.usuario','psicologo.usuario'] }) as Promise<Cita>;
  }
  async cambiarEstado(id_cita: number, input: UpdateEstadoCitaInput, user: any): Promise<Cita> {
    const cita = await this.repo.findOne({ where: { id_cita }, relations: ['estudiante','psicologo'] });
    if (!cita) throw new NotFoundException('Cita no encontrada.');
    // A01: verificar que el usuario solo modifica sus propias citas
    if (user.rol === RolNombre.ESTUDIANTE && cita.id_estudiante !== user.id_perfil)
      throw new ForbiddenException('No tienes permiso para modificar esta cita.');
    if (user.rol === RolNombre.PSICOLOGO && cita.id_psicologo !== user.id_perfil)
      throw new ForbiddenException('No tienes permiso para modificar esta cita.');
    // A03: query parametrizada (no string concat)
    await this.dataSource.query(
      'UPDATE dbo.Cita SET estado = @0 WHERE id_cita = @1',
      [input.estado, id_cita]
    );
    return this.repo.findOne({ where: { id_cita }, relations: ['estudiante','psicologo','sesion','estudiante.usuario','psicologo.usuario'] }) as Promise<Cita>;
  }
  citasEstudiante(id_estudiante: number): Promise<Cita[]> {
    return this.repo.find({ where: { id_estudiante }, relations: ['psicologo','psicologo.usuario','sesion'], order: { fecha: 'DESC' } });
  }
  agendaPsicologo(id_psicologo: number): Promise<Cita[]> {
    return this.repo.find({ where: { id_psicologo }, relations: ['estudiante','estudiante.usuario','sesion'], order: { fecha: 'ASC' } });
  }
}
