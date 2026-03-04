import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Estudiante } from './estudiante.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Rol } from '../rol/rol.entity';
import { CreateEstudianteInput } from './dto/create-estudiante.input';
import { RolNombre } from '../common/enums/rol.enum';

@Injectable()
export class EstudianteService {
  constructor(
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
  ) {}

  async create(input: CreateEstudianteInput): Promise<Estudiante | null> {
    const existe = await this.usuarioRepo.findOneBy({ correo: input.correo });
    if (existe) throw new ConflictException('El correo ya está registrado.');

    const rol = await this.rolRepo.findOneBy({ nombre: RolNombre.ESTUDIANTE });
    if (!rol) throw new NotFoundException('Rol estudiante no configurado en BD.');

    const hash = await bcrypt.hash(input.password, 10);
    const usuario = this.usuarioRepo.create({
      nombre: input.nombre,
      correo: input.correo,
      password_hash: hash,
      id_rol: rol.id_rol,
    });
    await this.usuarioRepo.save(usuario);

    const estudiante = this.estudianteRepo.create({
      id_usuario: usuario.id_usuario,
      matricula: input.matricula,
      carrera: input.carrera,
      telefono: input.telefono,
    });
    const saved = await this.estudianteRepo.save(estudiante);
    return this.estudianteRepo.findOne({
      where: { id_estudiante: saved.id_estudiante },
      relations: ['usuario'],
    });
  }

  async findAll(): Promise<Estudiante[]> {
    return this.estudianteRepo.find({ relations: ['usuario'] });
  }

  async findOne(id: number): Promise<Estudiante> {
    const est = await this.estudianteRepo.findOne({
      where: { id_estudiante: id },
      relations: ['usuario'],
    });
    if (!est) throw new NotFoundException(`Estudiante #${id} no encontrado.`);
    return est;
  }

  async findByUsuario(id_usuario: number): Promise<Estudiante | null> {
    return this.estudianteRepo.findOne({ where: { id_usuario }, relations: ['usuario'] });
  }
}