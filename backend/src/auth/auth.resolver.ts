import { Resolver, Mutation, Args, ObjectType, Field, Int } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';

@ObjectType()
class AuthPayload {
  @Field() access_token: string;
  @Field() rol: string;
  @Field() nombre: string;
  @Field() correo: string;
  @Field(() => Int, { nullable: true }) id_perfil?: number;
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // OWASP A07: rate limit estricto en login (5 intentos / 60s por IP)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    return this.authService.login(input.correo, input.password);
  }
}
