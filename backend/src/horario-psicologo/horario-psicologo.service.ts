import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HorarioPsicologo } from './horario-psicologo.entity';
import { CreateHorarioInput, UpdateHorarioInput } from './dto/horario.input';

@Injectable()
export class HorarioPsicologoService {
  constructor(
    @InjectRepository(HorarioPsicologo)
    private readonly repo: Repository<HorarioPsicologo>,
  ) {}

  async create(input: CreateHorarioInput): Promise<HorarioPsicologo> {
    const h = this.repo.create(input);
    return this.repo.save(h);
  }

  async findByPsicologo(id_psicologo: number): Promise<HorarioPsicologo[]> {
    return this.repo.find({ where: { id_psicologo, disponible: true } });
  }

  async update(id: number, input: UpdateHorarioInput): Promise<HorarioPsicologo> {
    const h = await this.repo.findOneBy({ id_horario: id });
    if (!h) throw new NotFoundException(`Horario #${id} no encontrado.`);
    Object.assign(h, input);
    return this.repo.save(h);
  }

  async remove(id: number): Promise<boolean> {
    await this.repo.delete(id);
    return true;
  }
}
