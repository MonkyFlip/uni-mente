import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

@InputType()
export class CreateSesionInput {
  @Field(() => Int)
  @IsInt()
  id_cita: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  numero_sesion: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notas?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  recomendaciones?: string;
}
