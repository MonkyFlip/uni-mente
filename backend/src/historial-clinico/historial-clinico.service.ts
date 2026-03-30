import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialClinico } from './historial-clinico.entity';
@Injectable()
export class HistorialClinicoService {
  constructor(@InjectRepository(HistorialClinico) private readonly repo: Repository<HistorialClinico>) {}
  expedienteEstudiante(id_estudiante: number): Promise<HistorialClinico[]> {
    return this.repo.find({ where: { id_estudiante }, relations: ['psicologo','psicologo.usuario','detalles','detalles.sesion'] });
  }
}
