import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { HistorialClinico } from '../historial-clinico/historial-clinico.entity';
import { Sesion } from '../sesion/sesion.entity';

@ObjectType()
@Entity('Detalle_Historial')
export class DetalleHistorial {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id_detalle: number;

  @Field(() => Int)
  @Column()
  id_historial: number;

  @ManyToOne(() => HistorialClinico, (h) => h.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_historial' })
  historial: HistorialClinico;

  @Field(() => Int)
  @Column()
  id_sesion: number;

  @Field(() => Sesion)
  @OneToOne(() => Sesion, { eager: true })
  @JoinColumn({ name: 'id_sesion' })
  sesion: Sesion;

  @Field()
  @CreateDateColumn()
  fecha_registro: Date;
}
