import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { HorarioPsicologo } from '../horario-psicologo/horario-psicologo.entity';
@ObjectType()
@Entity('Psicologo')
export class Psicologo {
  @Field(() => Int) @PrimaryGeneratedColumn() id_psicologo: number;
  @Field(() => Int) @Column() id_usuario: number;
  @Field() @Column({ type: 'nvarchar', length: 100 }) especialidad: string;
  @Field({ nullable: true }) @Column({ type: 'nvarchar', length: 50, nullable: true }) cedula?: string;
  @Field({ nullable: true }) @Column({ type: 'nvarchar', length: 20, nullable: true }) telefono?: string;
  @Field(() => Usuario) @OneToOne(() => Usuario) @JoinColumn({ name: 'id_usuario' }) usuario: Usuario;
  @Field(() => [HorarioPsicologo], { nullable: true }) @OneToMany(() => HorarioPsicologo, h => h.psicologo) horarios?: HorarioPsicologo[];
}
