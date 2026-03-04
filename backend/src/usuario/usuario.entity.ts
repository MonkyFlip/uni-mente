import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Rol } from '../rol/rol.entity';

@ObjectType()
@Entity('Usuario')
export class Usuario {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id_usuario: number;

  @Field()
  @Column({ length: 100 })
  nombre: string;

  @Field()
  @Column({ length: 150, unique: true })
  correo: string;

  // La contraseña NO se expone en GraphQL
  @Column({ length: 255 })
  password_hash: string;

  @Field(() => Int)
  @Column()
  id_rol: number;

  @Field(() => Rol)
  @ManyToOne(() => Rol, (r) => r.usuarios, { eager: true })
  @JoinColumn({ name: 'id_rol' })
  rol: Rol;

  @Field()
  @CreateDateColumn()
  created_at: Date;
}
