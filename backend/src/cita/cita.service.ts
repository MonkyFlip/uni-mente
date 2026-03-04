import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cita } from './cita.entity';
import { CreateCitaInput, UpdateEstadoCitaInput } from './dto/cita.input';
import { EstadoCita } from '../common/enums/estado-cita.enum';

@Injectable()
export class CitaService {
  constructor(
    @InjectRepository(Cita) private readonly repo: Repository<Cita>,
  ) {}

  async create(id_estudiante: number, input: CreateCitaInput): Promise<Cita> {
    // RF: Integridad — no se puede agendar si ya existe cita en ese horario
    const conflicto = await this.repo.findOne({
      where: {
        id_psicologo: input.id_psicologo,
        fecha: input.fecha,
        hora_inicio: input.hora_inicio,
        estado: EstadoCita.PENDIENTE,
      },
    });
    if (conflicto)
      throw new ConflictException(
        'El psicólogo ya tiene una cita en ese horario.',
      );

    const cita = this.repo.create({ id_estudiante, ...input });
    return this.repo.save(cita);
  }

  async findByPsicologo(id_psicologo: number): Promise<Cita[]> {
    return this.repo.find({
      where: { id_psicologo },
      relations: ['estudiante', 'sesion'],
      order: { fecha: 'ASC', hora_inicio: 'ASC' },
    });
  }

  async findByEstudiante(id_estudiante: number): Promise<Cita[]> {
    return this.repo.find({
      where: { id_estudiante },
      relations: ['psicologo'],
      order: { fecha: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Cita> {
    const c = await this.repo.findOne({
      where: { id_cita: id },
      relations: ['estudiante', 'psicologo', 'sesion'],
    });
    if (!c) throw new NotFoundException(`Cita #${id} no encontrada.`);
    return c;
  }

  async updateEstado(id: number, input: UpdateEstadoCitaInput): Promise<Cita> {
    const c = await this.findOne(id);
    c.estado = input.estado;
    return this.repo.save(c);
  }
}
