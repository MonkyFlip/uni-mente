import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';
import { EstadoCita } from '../../common/enums/estado-cita.enum';

@InputType()
export class CreateCitaInput {
  @Field(() => Int)
  id_psicologo: number;

  @Field()
  fecha: string; // 'YYYY-MM-DD'

  @Field()
  hora_inicio: string; // 'HH:MM'

  @Field()
  hora_fin: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  motivo?: string;
}

@InputType()
export class UpdateEstadoCitaInput {
  @Field(() => EstadoCita)
  estado: EstadoCita;
}
