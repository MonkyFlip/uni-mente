import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cita } from '../cita/cita.entity';
import { Psicologo } from '../psicologo/psicologo.entity';
import { Estudiante } from '../estudiante/estudiante.entity';

@ObjectType()
@Entity('Sesion')
export class Sesion {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id_sesion: number;

  @Field(() => Int)
  @Column()
  id_cita: number;

  @Field(() => Cita)
  @OneToOne(() => Cita, (c) => c.sesion, { eager: true })
  @JoinColumn({ name: 'id_cita' })
  cita: Cita;

  @Field(() => Int)
  @Column()
  numero_sesion: number; // Sesión #1, #2, #3… del estudiante con ese psicólogo

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  notas?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  recomendaciones?: string;

  @Field()
  @CreateDateColumn()
  fecha_registro: Date;
}
