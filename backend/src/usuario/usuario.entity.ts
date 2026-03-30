import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Rol } from '../rol/rol.entity';
@ObjectType()
@Entity('Usuario')
export class Usuario {
  @Field(() => Int) @PrimaryGeneratedColumn() id_usuario: number;
  @Field() @Column({ type: 'nvarchar', length: 150 }) nombre: string;
  @Field() @Column({ type: 'nvarchar', length: 120, unique: true }) correo: string;
  @Column({ type: 'nvarchar', length: 255 }) password_hash: string;
  @Column({ type: 'nvarchar', length: 255, nullable: true }) mfa_secret?: string;
  @Column({ type: 'bit', default: 0 }) mfa_enabled: boolean;
  @Field() @CreateDateColumn({ type: 'datetime2' }) created_at: Date;
  @Field(() => Int) @Column() id_rol: number;
  @Field(() => Rol, { nullable: true }) @ManyToOne(() => Rol) @JoinColumn({ name: 'id_rol' }) rol_obj?: Rol;
}
