import { InputType, Field, Int } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateHorarioInput {
  @Field(() => Int)
  id_psicologo: number;

  @Field()
  @IsString()
  dia_semana: string;

  @Field()
  @IsString()
  hora_inicio: string;

  @Field()
  @IsString()
  hora_fin: string;
}

@InputType()
export class UpdateHorarioInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  disponible?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  hora_inicio?: string;

  @Field({ nullable: true })
  @IsOptional()
  hora_fin?: string;
}
