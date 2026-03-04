import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from 'typeorm';
import { Estudiante } from '../estudiante/estudiante.entity';
import { Psicologo } from '../psicologo/psicologo.entity';
import { DetalleHistorial } from '../detalle-historial/detalle-historial.entity';

@ObjectType()
@Unique(['id_estudiante', 'id_psicologo'])
@Entity('Historial_Clinico')
export class HistorialClinico {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id_historial: number;

  @Field(() => Int)
  @Column()
  id_estudiante: number;

  @Field(() => Estudiante)
  @ManyToOne(() => Estudiante, (e) => e.historiales, { eager: true })
  @JoinColumn({ name: 'id_estudiante' })
  estudiante: Estudiante;

  @Field(() => Int)
  @Column()
  id_psicologo: number;

  @Field(() => Psicologo)
  @ManyToOne(() => Psicologo, { eager: true })
  @JoinColumn({ name: 'id_psicologo' })
  psicologo: Psicologo;

  @Field()
  @CreateDateColumn()
  fecha_apertura: Date;

  @Field(() => [DetalleHistorial], { nullable: true })
  @OneToMany(() => DetalleHistorial, (d) => d.historial)
  detalles: DetalleHistorial[];
}
