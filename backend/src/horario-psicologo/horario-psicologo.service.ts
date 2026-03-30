import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HorarioPsicologo } from './horario-psicologo.entity';
import { CreateHorarioInput } from './dto/horario.input';
@Injectable()
export class HorarioPsicologoService {
  constructor(@InjectRepository(HorarioPsicologo) private readonly repo: Repository<HorarioPsicologo>) {}
  async create(id_psicologo: number, input: CreateHorarioInput): Promise<HorarioPsicologo> {
    return this.repo.save(this.repo.create({ id_psicologo, ...input }));
  }
  async remove(id: number, id_psicologo: number): Promise<boolean> {
    const h = await this.repo.findOneBy({ id_horario: id, id_psicologo });
    if (!h) throw new NotFoundException('Horario no encontrado.');
    await this.repo.remove(h);
    return true;
  }
  findByPsicologo(id_psicologo: number): Promise<HorarioPsicologo[]> { return this.repo.findBy({ id_psicologo }); }
}
