import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Psicologo } from './psicologo.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Rol } from '../rol/rol.entity';
import { CreatePsicologoInput, UpdatePsicologoInput } from './dto/psicologo.input';
import { RolNombre } from '../common/enums/rol.enum';

@Injectable()
export class PsicologoService {
  constructor(
    @InjectRepository(Psicologo) private readonly psicologoRepo: Repository<Psicologo>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol) private readonly rolRepo: Repository<Rol>,
  ) {}

  async create(input: CreatePsicologoInput): Promise<Psicologo | null> {
    const existe = await this.usuarioRepo.findOneBy({ correo: input.correo });
    if (existe) throw new ConflictException('El correo ya está registrado.');

    const rol = await this.rolRepo.findOneBy({ nombre: RolNombre.PSICOLOGO });
    if (!rol) throw new NotFoundException('Rol psicólogo no configurado en BD.');

    const hash = await bcrypt.hash(input.password, 10);
    const usuario = this.usuarioRepo.create({
      nombre: input.nombre,
      correo: input.correo,
      password_hash: hash,
      id_rol: rol.id_rol,
    });
    await this.usuarioRepo.save(usuario);

    const psicologo = this.psicologoRepo.create({
      id_usuario: usuario.id_usuario,
      especialidad: input.especialidad,
      cedula: input.cedula,
      telefono: input.telefono,
    });
    const saved = await this.psicologoRepo.save(psicologo);
    return this.psicologoRepo.findOne({
      where: { id_psicologo: saved.id_psicologo },
      relations: ['usuario', 'horarios'],
    });
  }

  async findAll(): Promise<Psicologo[]> {
    return this.psicologoRepo.find({ relations: ['usuario', 'horarios'] });
  }

  async findOne(id: number): Promise<Psicologo> {
    const p = await this.psicologoRepo.findOne({
      where: { id_psicologo: id },
      relations: ['usuario', 'horarios'],
    });
    if (!p) throw new NotFoundException(`Psicólogo #${id} no encontrado.`);
    return p;
  }

  async findByUsuario(id_usuario: number): Promise<Psicologo | null> {
    return this.psicologoRepo.findOne({ where: { id_usuario }, relations: ['usuario', 'horarios'] });
  }

  async update(id: number, input: UpdatePsicologoInput): Promise<Psicologo> {
    const p = await this.findOne(id);
    Object.assign(p, input);
    return this.psicologoRepo.save(p);
  }
}
