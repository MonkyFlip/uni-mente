import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsString, Length, MinLength, IsOptional } from 'class-validator';
@ObjectType()
export class SetupMfaPayload { @Field() qr_code: string; @Field() secret: string; }
@InputType()
export class VerificarMfaInput {
  @Field() @IsString() @Length(6, 6, { message: 'El codigo MFA debe tener exactamente 6 digitos.' }) codigo: string;
}
@InputType()
export class CambiarPasswordInput {
  @Field() @IsString() password_actual: string;
  @Field() @IsString() @MinLength(8) password_nuevo: string;
  @Field({ nullable: true }) @IsOptional() @IsString() codigo_mfa?: string;
}
