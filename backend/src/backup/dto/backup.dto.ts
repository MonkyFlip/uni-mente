import { InputType, Field, Int } from '@nestjs/graphql';
import { IsIn, IsInt, Min, Max, IsString, IsOptional, Length } from 'class-validator';
const TIPOS    = ['COMPLETO','DIFERENCIAL','INCREMENTAL'] as const;
const FORMATOS = ['SQL','JSON','EXCEL','CSV'] as const;
@InputType()
export class CreateBackupInput {
  @Field() @IsIn(TIPOS) tipo: string;
  @Field() @IsIn(FORMATOS) formato: string;
  @Field({ nullable: true }) @IsOptional() @IsString() codigo_mfa?: string;
}
@InputType()
export class RestaurarBackupInput {
  @Field(() => Int) @IsInt() id_backup: number;
  @Field() @IsString() @Length(6, 6) codigo_mfa: string;
}
@InputType()
export class ConfigBackupAutoInput {
  @Field() @IsIn(TIPOS) tipo: string;
  @Field() @IsIn(FORMATOS) formato: string;
  @Field(() => Int) @IsInt() @Min(1) @Max(720) frecuencia_horas: number;
  @Field() @IsString() @Length(6, 6) codigo_mfa: string;
}
