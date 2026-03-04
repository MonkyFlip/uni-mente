import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialClinico } from './historial-clinico.entity';

@Injectable()
export class HistorialClinicoService {
  constructor(
    @InjectRepository(HistorialClinico)
    private readonly repo: Repository<HistorialClinico>,
  ) {}

  /**
   * RF D.3: Solo el psicólogo autorizado (o admin) puede ver el expediente.
   */
  async findByEstudiante(
    id_estudiante: number,
    requester: { id_psicologo?: number; isAdmin: boolean },
  ): Promise<HistorialClinico[]> {
    const historiales = await this.repo.find({
      where: { id_estudiante },
      relations: ['psicologo', 'estudiante', 'detalles', 'detalles.sesion'],
    });

    if (requester.isAdmin) return historiales;

    // El psicólogo solo ve los expedientes donde él es el tratante
    return historiales.filter(
      (h) => h.id_psicologo === requester.id_psicologo,
    );
  }

  async findOne(id: number): Promise<HistorialClinico> {
    const h = await this.repo.findOne({
      where: { id_historial: id },
      relations: ['psicologo', 'estudiante', 'detalles', 'detalles.sesion'],
    });
    if (!h) throw new NotFoundException(`Historial #${id} no encontrado.`);
    return h;
  }
}
