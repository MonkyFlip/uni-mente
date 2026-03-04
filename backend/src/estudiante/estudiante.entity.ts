import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { Cita } from '../cita/cita.entity';
import { HistorialClinico } from '../historial-clinico/historial-clinico.entity';

@ObjectType()
@Entity('Estudiante')
export class Estudiante {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id_estudiante: number;

  @Field(() => Int)
  @Column()
  id_usuario: number;

  @Field(() => Usuario)
  @OneToOne(() => Usuario, { eager: true, cascade: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Field({ nullable: true })
  @Column({ length: 20, nullable: true })
  matricula?: string;

  @Field({ nullable: true })
  @Column({ length: 100, nullable: true })
  carrera?: string;

  @Field({ nullable: true })
  @Column({ length: 15, nullable: true })
  telefono?: string;

  @OneToMany(() => Cita, (c) => c.estudiante)
  citas: Cita[];

  @OneToMany(() => HistorialClinico, (h) => h.estudiante)
  historiales: HistorialClinico[];
}
