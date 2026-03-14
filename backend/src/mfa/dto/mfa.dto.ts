import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsString, Length, MinLength, IsEmail } from 'class-validator';

@ObjectType()
export class SetupMfaPayload {
  /** Data URL base64 de la imagen PNG con el código QR */
  @Field()
  qr_code: string;

  /** Secreto base32 (para ingresar manualmente en la app si el QR falla) */
  @Field()
  secret: string;
}

@InputType()
export class VerificarMfaInput {
  @Field()
  @IsString()
  @Length(6, 6, { message: 'El código MFA debe tener exactamente 6 dígitos.' })
  codigo: string;
}

@InputType()
export class CambiarPasswordInput {
  @Field()
  @IsString()
  password_actual: string;

  @Field()
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  password_nuevo: string;

  /** Requerido solo si MFA está habilitado para la cuenta */
  @Field({ nullable: true })
  codigo_mfa?: string;
}
