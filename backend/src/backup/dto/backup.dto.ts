import { InputType, Field, Int } from '@nestjs/graphql';
import { IsIn, IsInt, Min, Max, IsString, Length } from 'class-validator';

const TIPOS    = ['COMPLETO', 'DIFERENCIAL', 'INCREMENTAL'] as const;
const FORMATOS = ['SQL', 'JSON', 'EXCEL', 'CSV'] as const;

@InputType()
export class CreateBackupInput {
  @Field({ description: 'COMPLETO | DIFERENCIAL | INCREMENTAL' })
  @IsIn(TIPOS, { message: 'tipo debe ser COMPLETO, DIFERENCIAL o INCREMENTAL' })
  tipo: string;

  @Field({ description: 'SQL | JSON | EXCEL | CSV' })
  @IsIn(FORMATOS, { message: 'formato debe ser SQL, JSON, EXCEL o CSV' })
  formato: string;

  /** Código MFA de 6 dígitos (requerido si la cuenta tiene MFA activo) */
  @Field({ nullable: true })
  codigo_mfa?: string;
}

@InputType()
export class RestaurarBackupInput {
  @Field(() => Int, { description: 'ID del backup a restaurar' })
  @IsInt()
  id_backup: number;

  @Field({ description: 'Código MFA de 6 dígitos' })
  @IsString()
  @Length(6, 6)
  codigo_mfa: string;
}

@InputType()
export class ConfigBackupAutoInput {
  @Field({ description: 'COMPLETO | DIFERENCIAL | INCREMENTAL' })
  @IsIn(TIPOS)
  tipo: string;

  @Field({ description: 'SQL | JSON | EXCEL | CSV' })
  @IsIn(FORMATOS)
  formato: string;

  @Field(() => Int, { description: 'Frecuencia en horas (1–720)' })
  @IsInt()
  @Min(1)
  @Max(720)
  frecuencia_horas: number;

  @Field({ description: 'Código MFA de 6 dígitos' })
  @IsString()
  @Length(6, 6)
  codigo_mfa: string;
}
