import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString } from 'class-validator';
@InputType()
export class LoginInput {
  @Field() @IsEmail() correo: string;
  @Field() @IsString() password: string;
}
