import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Sesion } from './sesion.entity';
import { CreateSesionInput } from './dto/create-sesion.input';
import { CitaService } from '../cita/cita.service';
import { EstadoCita } from '../common/enums/estado-cita.enum';
import { HistorialClinico } from '../historial-clinico/historial-clinico.entity';
import { DetalleHistorial } from '../detalle-historial/detalle-historial.entity';

@Injectable()
export class SesionService {
  constructor(
    @InjectRepository(Sesion) private readonly repo: Repository<Sesion>,
    @InjectRepository(HistorialClinico)
    private readonly historialRepo: Repository<HistorialClinico>,
    @InjectRepository(DetalleHistorial)
    private readonly detalleRepo: Repository<DetalleHistorial>,
    private readonly citaService: CitaService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registra la sesión y alimenta automáticamente el historial clínico.
   * RF D.1 + D.2
   */
  async create(input: CreateSesionInput): Promise<Sesion> {
    const cita = await this.citaService.findOne(input.id_cita);
    const id_estudiante = cita.estudiante.id_estudiante;
    const id_psicologo = cita.psicologo.id_psicologo;

    return this.dataSource.transaction(async (manager) => {
      // 1. Guardar sesión
      const sesion = manager.create(Sesion, input);
      await manager.save(sesion);

      // 2. Marcar cita como asistida
      cita.estado = EstadoCita.ASISTIDA;
      await manager.save(cita);

      // 3. Buscar o crear historial clínico del estudiante
      let historial = await manager.findOne(HistorialClinico, {
        where: { id_estudiante, id_psicologo },
      });
      if (!historial) {
        historial = manager.create(HistorialClinico, {
          id_estudiante,
          id_psicologo,
        });
        await manager.save(historial);
      }

      // 4. Vincular sesión al historial (Detalle_Historial)
      const detalle = manager.create(DetalleHistorial, {
        id_historial: historial.id_historial,
        id_sesion: sesion.id_sesion,
      });
      await manager.save(detalle);

      return sesion;
    });
  }

  async findByCita(id_cita: number): Promise<Sesion | null> {
    return this.repo.findOne({ where: { id_cita } });
  }
}
