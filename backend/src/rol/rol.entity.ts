import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

@ObjectType()
@Entity('Rol')
export class Rol {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id_rol: number;

  @Field()
  @Column({ length: 50, unique: true })
  nombre: string; // 'administrador' | 'psicologo' | 'estudiante'

  @OneToMany(() => Usuario, (u) => u.rol)
  usuarios: Usuario[];
}
