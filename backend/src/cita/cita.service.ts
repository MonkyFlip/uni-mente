import {
  Injectable, ConflictException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cita } from './cita.entity';
import { CreateCitaInput, UpdateEstadoCitaInput } from './dto/cita.input';
import { HorarioPsicologo } from '../horario-psicologo/horario-psicologo.entity';

const DIA_MAP: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3,
  jueves: 4, viernes: 5, sabado: 6,
};

@Injectable()
export class CitaService {
  constructor(
    @InjectRepository(Cita)
    private readonly repo: Repository<Cita>,
    @InjectRepository(HorarioPsicologo)
    private readonly horarioRepo: Repository<HorarioPsicologo>,
    private readonly dataSource: DataSource,
  ) {}

  async create(id_estudiante: number, input: CreateCitaInput): Promise<Cita> {
    const horario = await this.horarioRepo.findOne({
      where: { id_horario: input.id_horario, id_psicologo: input.id_psicologo, disponible: true },
    });
    if (!horario) throw new NotFoundException('El horario seleccionado no existe o no está disponible.');

    const [anio, mes, dia] = input.fecha.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    if (fecha.getDay() !== (DIA_MAP[horario.dia_semana.toLowerCase()] ?? -1)) {
      throw new BadRequestException(`La fecha no corresponde al día "${horario.dia_semana}" del horario.`);
    }

    const conflicto = await this.repo.findOne({
      where: { id_psicologo: input.id_psicologo, fecha: input.fecha, hora_inicio: horario.hora_inicio, estado: 'PENDIENTE' },
    });
    if (conflicto) throw new ConflictException('El psicólogo ya tiene una cita en ese horario para esa fecha.');

    const result = await this.dataSource.query(
      `INSERT INTO Cita (id_estudiante, id_psicologo, fecha, hora_inicio, hora_fin, estado, motivo)
       VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?)`,
      [id_estudiante, input.id_psicologo, input.fecha, horario.hora_inicio, horario.hora_fin, input.motivo ?? null],
    );
    return this.findOne(result.insertId);
  }

  async findByPsicologo(id_psicologo: number): Promise<Cita[]> {
    return this.repo.find({
      where: { id_psicologo },
      relations: ['estudiante', 'estudiante.usuario', 'sesion'],
      order: { fecha: 'ASC', hora_inicio: 'ASC' },
    });
  }

  async findByEstudiante(id_estudiante: number): Promise<Cita[]> {
    return this.repo.find({
      where: { id_estudiante },
      relations: ['psicologo', 'psicologo.usuario'],
      order: { fecha: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Cita> {
    const c = await this.repo.findOne({
      where: { id_cita: id },
      relations: ['estudiante', 'estudiante.usuario', 'psicologo', 'psicologo.usuario', 'sesion'],
    });
    if (!c) throw new NotFoundException(`Cita #${id} no encontrada.`);
    return c;
  }

  async updateEstado(id: number, input: UpdateEstadoCitaInput): Promise<Cita> {
    // Raw SQL — evita cualquier transformación de TypeORM sobre el valor del campo
    await this.dataSource.query(
      'UPDATE Cita SET estado = ? WHERE id_cita = ?',
      [input.estado, id],
    );
    return this.findOne(id);
  }
}
