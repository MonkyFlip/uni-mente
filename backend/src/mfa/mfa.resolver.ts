import { Resolver, Mutation, Args, Query, ObjectType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { SetupMfaPayload, VerificarMfaInput, CambiarPasswordInput } from './dto/mfa.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
@ObjectType() class MfaEstado { @Field() mfa_enabled: boolean; }
@UseGuards(JwtAuthGuard)
@Resolver()
export class MfaResolver {
  constructor(private readonly mfaService: MfaService) {}
  @Mutation(() => SetupMfaPayload) setupMfa(@CurrentUser() u: any): Promise<SetupMfaPayload> { return this.mfaService.setupMfa(u.id_usuario); }
  @Mutation(() => Boolean) habilitarMfa(@CurrentUser() u: any, @Args('input') i: VerificarMfaInput): Promise<boolean> { return this.mfaService.habilitarMfa(u.id_usuario, i.codigo); }
  @Mutation(() => Boolean) deshabilitarMfa(@CurrentUser() u: any, @Args('input') i: VerificarMfaInput): Promise<boolean> { return this.mfaService.deshabilitarMfa(u.id_usuario, i.codigo); }
  @Mutation(() => Boolean) verificarMfa(@CurrentUser() u: any, @Args('input') i: VerificarMfaInput): Promise<boolean> { return this.mfaService.verificarCodigo(u.id_usuario, i.codigo); }
  @Mutation(() => Boolean) cambiarPassword(@CurrentUser() u: any, @Args('input') i: CambiarPasswordInput): Promise<boolean> { return this.mfaService.cambiarPassword(u.id_usuario, i); }
  @Query(() => MfaEstado) miEstadoMfa(@CurrentUser() u: any): Promise<MfaEstado> { return this.mfaService.obtenerEstadoMfa(u.id_usuario); }
}
