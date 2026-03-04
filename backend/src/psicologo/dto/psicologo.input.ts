import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class CreatePsicologoInput {
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
  especialidad?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cedula?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  telefono?: string;
}

@InputType()
export class UpdatePsicologoInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  especialidad?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cedula?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  telefono?: string;
}
