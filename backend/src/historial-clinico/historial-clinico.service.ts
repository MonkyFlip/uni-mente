import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialClinico } from './historial-clinico.entity';

@Injectable()
export class HistorialClinicoService {
  constructor(
    @InjectRepository(HistorialClinico) private readonly repo: Repository<HistorialClinico>,
  ) {}

  /**
   * Expediente de un estudiante visto por el psicologo o admin.
   * Devuelve todos sus historiales con sus sesiones ordenadas por fecha.
   */
  expedienteEstudiante(id_estudiante: number): Promise<HistorialClinico[]> {
    return this.repo.find({
      where:     { id_estudiante },
      relations: ['psicologo', 'psicologo.usuario', 'detalles', 'detalles.sesion'],
      order:     { fecha_apertura: 'DESC' },
    });
  }

  /**
   * Todos los pacientes del psicologo autenticado.
   * Incluye datos del estudiante y todas sus sesiones registradas.
   */
  porPsicologo(id_psicologo: number): Promise<HistorialClinico[]> {
    return this.repo
      .createQueryBuilder('h')
      .innerJoinAndSelect('h.estudiante', 'e')
      .innerJoinAndSelect('e.usuario', 'u')
      .leftJoinAndSelect('h.detalles', 'd')
      .leftJoinAndSelect('d.sesion', 's')
      .where('h.id_psicologo = :id_psicologo', { id_psicologo })
      .orderBy('h.fecha_apertura', 'DESC')
      .addOrderBy('s.fecha_registro', 'ASC')
      .getMany();
  }
}
