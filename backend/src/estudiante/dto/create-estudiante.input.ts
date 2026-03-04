import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class CreateEstudianteInput {
  @Field()
  @IsString()
  nombre: string;

  @Field()
  @IsEmail()
  correo: string;

  @Field()
  @MinLength(8)
  password: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  matricula?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  carrera?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  telefono?: string;
}
