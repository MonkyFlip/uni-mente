import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sesion } from './sesion.entity';
import { Cita } from '../cita/cita.entity';
import { HistorialClinico } from '../historial-clinico/historial-clinico.entity';
import { DetalleHistorial } from '../detalle-historial/detalle-historial.entity';
import { CreateSesionInput } from './dto/create-sesion.input';
@Injectable()
export class SesionService {
  constructor(
    @InjectRepository(Sesion)           private readonly sesionRepo:    Repository<Sesion>,
    @InjectRepository(Cita)             private readonly citaRepo:      Repository<Cita>,
    @InjectRepository(HistorialClinico) private readonly historialRepo: Repository<HistorialClinico>,
    @InjectRepository(DetalleHistorial) private readonly detalleRepo:   Repository<DetalleHistorial>,
    private readonly dataSource: DataSource,
  ) {}
  async create(input: CreateSesionInput): Promise<Sesion> {
    const cita = await this.citaRepo.findOne({ where: { id_cita: input.id_cita }, relations: ['estudiante','psicologo'] });
    if (!cita) throw new NotFoundException('Cita no encontrada.');
    return this.dataSource.transaction(async mgr => {
      const sesion      = await mgr.save(Sesion, mgr.create(Sesion, { ...input }));
      // A03: SQL parametrizado — estado siempre desde enum, no del cliente
      await mgr.query('UPDATE dbo.Cita SET estado = @0 WHERE id_cita = @1', ['ASISTIDA', input.id_cita]);
      let historial = await mgr.findOne(HistorialClinico, { where: { id_estudiante: cita.id_estudiante, id_psicologo: cita.id_psicologo } });
      if (!historial) historial = await mgr.save(HistorialClinico, mgr.create(HistorialClinico, { id_estudiante: cita.id_estudiante, id_psicologo: cita.id_psicologo }));
      await mgr.save(DetalleHistorial, mgr.create(DetalleHistorial, { id_historial: historial.id_historial, id_sesion: sesion.id_sesion }));
      return sesion;
    });
  }
}
