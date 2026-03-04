import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EstadoCita } from '../common/enums/estado-cita.enum';
import { Estudiante } from '../estudiante/estudiante.entity';
import { Psicologo } from '../psicologo/psicologo.entity';
import { Sesion } from '../sesion/sesion.entity';

registerEnumType(EstadoCita, { name: 'EstadoCita' });

@ObjectType()
// RF: No se permiten dos citas para el mismo psicólogo en el mismo horario
@Unique(['id_psicologo', 'fecha', 'hora_inicio'])
@Entity('Cita')
export class Cita {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id_cita: number;

  @Field(() => Int)
  @Column()
  id_estudiante: number;

  @Field(() => Estudiante)
  @ManyToOne(() => Estudiante, (e) => e.citas, { eager: true })
  @JoinColumn({ name: 'id_estudiante' })
  estudiante: Estudiante;

  @Field(() => Int)
  @Column()
  id_psicologo: number;

  @Field(() => Psicologo)
  @ManyToOne(() => Psicologo, (p) => p.citas, { eager: true })
  @JoinColumn({ name: 'id_psicologo' })
  psicologo: Psicologo;

  @Field()
  @Column({ type: 'date' })
  fecha: string;

  @Field()
  @Column({ type: 'time' })
  hora_inicio: string;

  @Field()
  @Column({ type: 'time' })
  hora_fin: string;

  @Field(() => EstadoCita)
  @Column({ type: 'enum', enum: EstadoCita, default: EstadoCita.PENDIENTE })
  estado: EstadoCita;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  motivo?: string;

  @Field()
  @CreateDateColumn()
  created_at: Date;

  @Field(() => Sesion, { nullable: true })
  @OneToOne(() => Sesion, (s) => s.cita, { nullable: true })
  sesion?: Sesion;
}
