import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { HorarioPsicologo } from '../horario-psicologo/horario-psicologo.entity';
import { Cita } from '../cita/cita.entity';

@ObjectType()
@Entity('Psicologo')
export class Psicologo {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id_psicologo: number;

  @Field(() => Int)
  @Column()
  id_usuario: number;

  @Field(() => Usuario)
  @OneToOne(() => Usuario, { eager: true, cascade: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Field({ nullable: true })
  @Column({ length: 100, nullable: true })
  especialidad?: string;

  @Field({ nullable: true })
  @Column({ length: 20, nullable: true, unique: true })
  cedula?: string;

  @Field({ nullable: true })
  @Column({ length: 15, nullable: true })
  telefono?: string;

  @Field(() => [HorarioPsicologo], { nullable: true })
  @OneToMany(() => HorarioPsicologo, (h) => h.psicologo)
  horarios: HorarioPsicologo[];

  @OneToMany(() => Cita, (c) => c.psicologo)
  citas: Cita[];
}
