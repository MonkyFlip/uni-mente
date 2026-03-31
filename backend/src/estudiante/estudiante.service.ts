import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Estudiante } from './estudiante.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Rol } from '../rol/rol.entity';
import { CreateEstudianteInput } from './dto/create-estudiante.input';

@Injectable()
export class EstudianteService {
  constructor(
    @InjectRepository(Estudiante) private readonly repo: Repository<Estudiante>,
    @InjectRepository(Usuario)    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)        private readonly rolRepo: Repository<Rol>,
  ) {}

  async create(input: CreateEstudianteInput): Promise<Estudiante> {
    if (await this.usuarioRepo.findOneBy({ correo: input.correo }))
      throw new ConflictException('El correo ya esta registrado.');
    const rol  = await this.rolRepo.findOneBy({ nombre: 'estudiante' });
    const hash = await bcrypt.hash(input.password, 12);
    const u    = this.usuarioRepo.create({ nombre: input.nombre, correo: input.correo, password_hash: hash, id_rol: rol!.id_rol });
    const saved = await this.usuarioRepo.save(u);
    const e = this.repo.create({ id_usuario: saved.id_usuario, matricula: input.matricula, carrera: input.carrera, telefono: input.telefono });
    return this.repo.save(e);
  }

  /** Toggle activo/inactivo — eliminacion logica */
  async toggleActivo(id: number): Promise<Estudiante> {
    const e = await this.findOne(id);
    if (!e) throw new NotFoundException('Estudiante no encontrado.');
    const nuevoEstado = !e.usuario.activo;
    await this.usuarioRepo.update(e.id_usuario, { activo: nuevoEstado } as any);
    return this.findOne(id) as Promise<Estudiante>;
  }

  /** Solo estudiantes activos */
  findAll(): Promise<Estudiante[]> {
    return this.repo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.usuario', 'u', 'u.activo = :activo', { activo: true })
      .getMany();
  }

  /** Todos los estudiantes incluidos inactivos — para admin */
  findAllAdmin(): Promise<Estudiante[]> {
    return this.repo.find({ relations: ['usuario'] });
  }

  findOne(id: number): Promise<Estudiante | null> {
    return this.repo.findOne({ where: { id_estudiante: id }, relations: ['usuario'] });
  }

  findByUsuario(id_usuario: number): Promise<Estudiante | null> {
    return this.repo.findOne({ where: { id_usuario }, relations: ['usuario'] });
  }
}
