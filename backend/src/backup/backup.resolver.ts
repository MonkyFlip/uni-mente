import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupLog } from './entities/backup-log.entity';
import { BackupConfig } from './entities/backup-config.entity';
import { CreateBackupInput, RestaurarBackupInput, ConfigBackupAutoInput } from './dto/backup.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolNombre } from '../common/enums/rol.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolNombre.ADMINISTRADOR)
@Resolver()
export class BackupResolver {
  constructor(private readonly backupService: BackupService) {}

  // ── Queries ────────────────────────────────────────────────────

  @Query(() => [BackupLog], {
    name: 'listarBackups',
    description: 'Lista todos los backups disponibles (máx. 3)',
  })
  async listarBackups(): Promise<BackupLog[]> {
    return this.backupService.listarBackups();
  }

  @Query(() => BackupConfig, {
    name: 'configBackupAutomatico',
    nullable: true,
    description: 'Obtiene la configuración actual de backup automático',
  })
  async configBackupAutomatico(): Promise<BackupConfig | null> {
    return this.backupService.obtenerConfig();
  }

  // ── Mutations ──────────────────────────────────────────────────

  @Mutation(() => BackupLog, {
    description: 'Crea un backup manual. Requiere MFA si la cuenta lo tiene activo.',
  })
  async crearBackup(
    @Args('input') input: CreateBackupInput,
    @CurrentUser() user: any,
  ): Promise<BackupLog> {
    return this.backupService.crearBackup(input, user.id_usuario);
  }

  @Mutation(() => Boolean, {
    description: 'Restaura la BD desde un backup. Siempre requiere código MFA.',
  })
  async restaurarBackup(
    @Args('input') input: RestaurarBackupInput,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    return this.backupService.restaurarBackup(input, user.id_usuario);
  }

  @Mutation(() => BackupConfig, {
    description: 'Configura el backup automático y ejecuta uno inmediatamente.',
  })
  async configurarBackupAutomatico(
    @Args('input') input: ConfigBackupAutoInput,
    @CurrentUser() user: any,
  ): Promise<BackupConfig> {
    return this.backupService.configurarAutomatico(input, user.id_usuario);
  }
}
