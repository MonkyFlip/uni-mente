import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
@InputType()
export class CreatePsicologoInput {
  @Field() @IsString() nombre: string;
  @Field() @IsEmail() correo: string;
  @Field() @IsString() @MinLength(8) password: string;
  @Field() @IsString() especialidad: string;
  @Field({ nullable: true }) @IsOptional() @IsString() cedula?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() telefono?: string;
}
@InputType()
export class UpdatePsicologoInput {
  @Field({ nullable: true }) @IsOptional() @IsString() nombre?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() especialidad?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() cedula?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() telefono?: string;
}
