import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Cita } from '../cita/cita.entity';
@ObjectType()
@Entity('Sesion')
export class Sesion {
  @Field(() => Int) @PrimaryGeneratedColumn() id_sesion: number;
  @Field(() => Int) @Column() id_cita: number;
  @Field(() => Int) @Column({ default: 1 }) numero_sesion: number;
  @Field({ nullable: true }) @Column({ type: 'nvarchar', length: 'max', nullable: true }) notas?: string;
  @Field({ nullable: true }) @Column({ type: 'nvarchar', length: 'max', nullable: true }) recomendaciones?: string;
  @Field() @CreateDateColumn({ type: 'datetime2' }) fecha_registro: Date;
  @OneToOne(() => Cita, c => c.sesion) @JoinColumn({ name: 'id_cita' }) cita: Cita;
}
