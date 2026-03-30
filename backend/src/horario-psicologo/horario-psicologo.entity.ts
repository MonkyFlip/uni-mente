import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Psicologo } from '../psicologo/psicologo.entity';
@ObjectType()
@Entity('Horario_Psicologo')
export class HorarioPsicologo {
  @Field(() => Int) @PrimaryGeneratedColumn() id_horario: number;
  @Field(() => Int) @Column() id_psicologo: number;
  @Field() @Column({ type: 'nvarchar', length: 15 }) dia_semana: string;
  @Field() @Column({ type: 'time' }) hora_inicio: string;
  @Field() @Column({ type: 'time' }) hora_fin: string;
  @Field() @Column({ type: 'bit', default: 1 }) disponible: boolean;
  @ManyToOne(() => Psicologo, p => p.horarios) @JoinColumn({ name: 'id_psicologo' }) psicologo: Psicologo;
}
