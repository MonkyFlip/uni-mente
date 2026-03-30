import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@ObjectType()
@Entity('Rol')
export class Rol {
  @Field(() => Int) @PrimaryGeneratedColumn() id_rol: number;
  @Field() @Column({ unique: true }) nombre: string;
}
