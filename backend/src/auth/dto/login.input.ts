import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsEmail, MinLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  correo: string;

  @Field()
  @MinLength(8)
  password: string;
}

@ObjectType()
export class AuthPayload {
  @Field()
  access_token: string;

  @Field()
  rol: string;

  @Field()
  nombre: string;
}
