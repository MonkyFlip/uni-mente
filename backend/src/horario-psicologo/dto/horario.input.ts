import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsIn } from 'class-validator';
@InputType()
export class CreateHorarioInput {
  @Field() @IsIn(['lunes','martes','miercoles','jueves','viernes','sabado']) dia_semana: string;
  @Field() @IsString() hora_inicio: string;
  @Field() @IsString() hora_fin: string;
}
