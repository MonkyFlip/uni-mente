import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Estudiante } from '../estudiante/estudiante.entity';
import { Psicologo } from '../psicologo/psicologo.entity';
import { DetalleHistorial } from '../detalle-historial/detalle-historial.entity';
@ObjectType()
@Entity('Historial_Clinico')
export class HistorialClinico {
  @Field(() => Int) @PrimaryGeneratedColumn() id_historial: number;
  @Field(() => Int) @Column() id_estudiante: number;
  @Field(() => Int) @Column() id_psicologo: number;
  @Field() @CreateDateColumn({ type: 'datetime2' }) fecha_apertura: Date;
  @Field(() => Estudiante) @ManyToOne(() => Estudiante) @JoinColumn({ name: 'id_estudiante' }) estudiante: Estudiante;
  @Field(() => Psicologo) @ManyToOne(() => Psicologo) @JoinColumn({ name: 'id_psicologo' }) psicologo: Psicologo;
  @Field(() => [DetalleHistorial], { nullable: true }) @OneToMany(() => DetalleHistorial, d => d.historial) detalles?: DetalleHistorial[];
}
