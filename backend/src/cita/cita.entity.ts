import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Estudiante } from '../estudiante/estudiante.entity';
import { Psicologo } from '../psicologo/psicologo.entity';
import { Sesion } from '../sesion/sesion.entity';
@ObjectType()
@Entity('Cita')
export class Cita {
  @Field(() => Int) @PrimaryGeneratedColumn() id_cita: number;
  @Field(() => Int) @Column() id_estudiante: number;
  @Field(() => Int) @Column() id_psicologo: number;
  @Field() @Column({ type: 'date' }) fecha: string;
  @Field() @Column({ type: 'time' }) hora_inicio: string;
  @Field() @Column({ type: 'time' }) hora_fin: string;
  @Field() @Column({ type: 'nvarchar', length: 20, default: 'PENDIENTE' }) estado: string;
  @Field({ nullable: true }) @Column({ type: 'nvarchar', length: 'max', nullable: true }) motivo?: string;
  @Field() @CreateDateColumn({ type: 'datetime2' }) created_at: Date;
  @Field(() => Estudiante) @ManyToOne(() => Estudiante) @JoinColumn({ name: 'id_estudiante' }) estudiante: Estudiante;
  @Field(() => Psicologo) @ManyToOne(() => Psicologo) @JoinColumn({ name: 'id_psicologo' }) psicologo: Psicologo;
  @Field(() => Sesion, { nullable: true }) @OneToOne(() => Sesion, s => s.cita) sesion?: Sesion;
}
