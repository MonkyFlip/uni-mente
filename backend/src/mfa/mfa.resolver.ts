import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { SetupMfaPayload, VerificarMfaInput, CambiarPasswordInput } from './dto/mfa.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class MfaEstado {
  @Field()
  mfa_enabled: boolean;
}

@UseGuards(JwtAuthGuard)
@Resolver()
export class MfaResolver {
  constructor(private readonly mfaService: MfaService) {}

  /**
   * Paso 1: El usuario solicita configurar MFA.
   * Devuelve el QR y el secreto. No activa MFA aún.
   */
  @Mutation(() => SetupMfaPayload, { description: 'Genera QR y secreto TOTP para configurar MFA' })
  async setupMfa(@CurrentUser() user: any): Promise<SetupMfaPayload> {
    return this.mfaService.setupMfa(user.id_usuario);
  }

  /**
   * Paso 2: Verificar primer código con la app para activar MFA.
   */
  @Mutation(() => Boolean, { description: 'Activa MFA después de escanear el QR y verificar el primer código' })
  async habilitarMfa(
    @CurrentUser() user: any,
    @Args('input') input: VerificarMfaInput,
  ): Promise<boolean> {
    return this.mfaService.habilitarMfa(user.id_usuario, input.codigo);
  }

  /**
   * Desactivar MFA (requiere código válido para confirmar).
   */
  @Mutation(() => Boolean, { description: 'Desactiva MFA de la cuenta actual' })
  async deshabilitarMfa(
    @CurrentUser() user: any,
    @Args('input') input: VerificarMfaInput,
  ): Promise<boolean> {
    return this.mfaService.deshabilitarMfa(user.id_usuario, input.codigo);
  }

  /**
   * Verificar un código puntual (para pre-chequeos en el frontend).
   */
  @Mutation(() => Boolean, { description: 'Verifica si un código MFA es válido en este momento' })
  async verificarMfa(
    @CurrentUser() user: any,
    @Args('input') input: VerificarMfaInput,
  ): Promise<boolean> {
    return this.mfaService.verificarCodigo(user.id_usuario, input.codigo);
  }

  /**
   * Cambio de contraseña con verificación de contraseña actual + MFA opcional.
   */
  @Mutation(() => Boolean, { description: 'Cambia la contraseña del usuario autenticado' })
  async cambiarPassword(
    @CurrentUser() user: any,
    @Args('input') input: CambiarPasswordInput,
  ): Promise<boolean> {
    return this.mfaService.cambiarPassword(user.id_usuario, input);
  }

  /**
   * Consultar si MFA está activo en la cuenta actual.
   */
  @Query(() => MfaEstado, { description: 'Estado de MFA del usuario autenticado' })
  async miEstadoMfa(@CurrentUser() user: any): Promise<MfaEstado> {
    return this.mfaService.obtenerEstadoMfa(user.id_usuario);
  }
}
