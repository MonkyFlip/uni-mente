import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { EstadoCita } from '../../common/enums/estado-cita.enum';
@InputType()
export class CreateCitaInput {
  @Field(() => Int) @IsInt() id_psicologo: number;
  @Field(() => Int) @IsInt() id_horario: number;
  @Field() @IsDateString() fecha: string;
  @Field({ nullable: true }) @IsOptional() @IsString() motivo?: string;
}
@InputType()
export class UpdateEstadoCitaInput {
  @Field(() => EstadoCita) @IsEnum(EstadoCita) estado: EstadoCita;
}
