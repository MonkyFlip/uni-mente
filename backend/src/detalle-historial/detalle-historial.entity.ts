import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { HistorialClinico } from '../historial-clinico/historial-clinico.entity';
import { Sesion } from '../sesion/sesion.entity';
@ObjectType()
@Entity('Detalle_Historial')
export class DetalleHistorial {
  @Field(() => Int) @PrimaryGeneratedColumn() id_detalle: number;
  @Field(() => Int) @Column() id_historial: number;
  @Field(() => Int) @Column() id_sesion: number;
  @Field() @CreateDateColumn({ type: 'datetime2' }) fecha_registro: Date;
  @ManyToOne(() => HistorialClinico, h => h.detalles) @JoinColumn({ name: 'id_historial' }) historial: HistorialClinico;
  @Field(() => Sesion) @OneToOne(() => Sesion) @JoinColumn({ name: 'id_sesion' }) sesion: Sesion;
}
