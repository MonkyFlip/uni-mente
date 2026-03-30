import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
@ObjectType()
@Entity('Estudiante')
export class Estudiante {
  @Field(() => Int) @PrimaryGeneratedColumn() id_estudiante: number;
  @Field(() => Int) @Column() id_usuario: number;
  @Field({ nullable: true }) @Column({ type: 'nvarchar', length: 20, nullable: true }) matricula?: string;
  @Field({ nullable: true }) @Column({ type: 'nvarchar', length: 100, nullable: true }) carrera?: string;
  @Field({ nullable: true }) @Column({ type: 'nvarchar', length: 20, nullable: true }) telefono?: string;
  @Field(() => Usuario) @OneToOne(() => Usuario) @JoinColumn({ name: 'id_usuario' }) usuario: Usuario;
}
