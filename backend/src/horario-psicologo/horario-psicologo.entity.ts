import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Psicologo } from '../psicologo/psicologo.entity';

@ObjectType()
@Entity('Horario_Psicologo')
export class HorarioPsicologo {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id_horario: number;

  @Field(() => Int)
  @Column()
  id_psicologo: number;

  @ManyToOne(() => Psicologo, (p) => p.horarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_psicologo' })
  psicologo: Psicologo;

  // 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'
  @Field()
  @Column({ length: 20 })
  dia_semana: string;

  @Field()
  @Column({ type: 'time' })
  hora_inicio: string; // '08:00:00'

  @Field()
  @Column({ type: 'time' })
  hora_fin: string; // '09:00:00'

  @Field()
  @Column({ default: true })
  disponible: boolean;
}
