import { Injectable, ConflictException } from '@nestjs/common';
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
  findAll(): Promise<Estudiante[]> { return this.repo.find({ relations: ['usuario'] }); }
  findOne(id: number): Promise<Estudiante | null> { return this.repo.findOne({ where: { id_estudiante: id }, relations: ['usuario'] }); }
  findByUsuario(id_usuario: number): Promise<Estudiante | null> { return this.repo.findOne({ where: { id_usuario }, relations: ['usuario'] }); }
}
