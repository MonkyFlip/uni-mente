import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString } from 'class-validator';
@InputType()
export class CreateSesionInput {
  @Field(() => Int) @IsInt() id_cita: number;
  @Field(() => Int) @IsInt() numero_sesion: number;
  @Field({ nullable: true }) @IsOptional() @IsString() notas?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() recomendaciones?: string;
}
