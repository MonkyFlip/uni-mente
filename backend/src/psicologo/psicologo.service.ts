import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Psicologo } from './psicologo.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Rol } from '../rol/rol.entity';
import { CreatePsicologoInput, UpdatePsicologoInput } from './dto/psicologo.input';

@Injectable()
export class PsicologoService {
  constructor(
    @InjectRepository(Psicologo) private readonly repo: Repository<Psicologo>,
    @InjectRepository(Usuario)   private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)       private readonly rolRepo: Repository<Rol>,
  ) {}

  async create(input: CreatePsicologoInput): Promise<Psicologo> {
    if (await this.usuarioRepo.findOneBy({ correo: input.correo }))
      throw new ConflictException('El correo ya esta registrado.');
    const rol  = await this.rolRepo.findOneBy({ nombre: 'psicologo' });
    const hash = await bcrypt.hash(input.password, 12);
    const u    = this.usuarioRepo.create({ nombre: input.nombre, correo: input.correo, password_hash: hash, id_rol: rol!.id_rol });
    const saved = await this.usuarioRepo.save(u);
    const p = this.repo.create({ id_usuario: saved.id_usuario, especialidad: input.especialidad, cedula: input.cedula, telefono: input.telefono });
    const ps = await this.repo.save(p);
    return this.findOne(ps.id_psicologo) as Promise<Psicologo>;
  }

  async update(id: number, input: UpdatePsicologoInput): Promise<Psicologo> {
    const p = await this.findOne(id);
    if (!p) throw new NotFoundException('Psicologo no encontrado.');
    if (input.especialidad !== undefined) p.especialidad = input.especialidad;
    if (input.cedula       !== undefined) p.cedula       = input.cedula;
    if (input.telefono     !== undefined) p.telefono     = input.telefono;
    if (input.nombre       !== undefined) await this.usuarioRepo.update(p.id_usuario, { nombre: input.nombre });
    await this.repo.save(p);
    return this.findOne(id) as Promise<Psicologo>;
  }

  /** Toggle activo/inactivo — eliminacion logica */
  async toggleActivo(id: number): Promise<Psicologo> {
    const p = await this.findOne(id);
    if (!p) throw new NotFoundException('Psicologo no encontrado.');
    const nuevoEstado = !p.usuario.activo;
    await this.usuarioRepo.update(p.id_usuario, { activo: nuevoEstado } as any);
    return this.findOne(id) as Promise<Psicologo>;
  }

  /** Solo psicologos con usuario activo — para el flujo publico de estudiantes */
  findAll(): Promise<Psicologo[]> {
    return this.repo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.usuario', 'u', 'u.activo = :activo', { activo: true })
      .leftJoinAndSelect('p.horarios', 'h')
      .getMany();
  }

  /** Todos los psicologos (activos e inactivos) — para el panel de admin */
  findAllAdmin(): Promise<Psicologo[]> {
    return this.repo.find({ relations: ['usuario', 'horarios'] });
  }

  findOne(id: number): Promise<Psicologo | null> {
    return this.repo.findOne({ where: { id_psicologo: id }, relations: ['usuario', 'horarios'] });
  }

  findByUsuario(id_usuario: number): Promise<Psicologo | null> {
    return this.repo.findOne({ where: { id_usuario }, relations: ['usuario'] });
  }
}
