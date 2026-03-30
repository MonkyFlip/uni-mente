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
@UseGuards(JwtAuthGuard, RolesGuard) @Roles(RolNombre.ADMINISTRADOR)
@Resolver()
export class BackupResolver {
  constructor(private readonly backupService: BackupService) {}
  @Query(() => [BackupLog], { name: 'listarBackups' }) listarBackups(): Promise<BackupLog[]> { return this.backupService.listarBackups(); }
  @Query(() => BackupConfig, { name: 'configBackupAutomatico', nullable: true }) configBackupAutomatico(): Promise<BackupConfig | null> { return this.backupService.obtenerConfig(); }
  @Mutation(() => BackupLog) crearBackup(@Args('input') input: CreateBackupInput, @CurrentUser() u: any): Promise<BackupLog> { return this.backupService.crearBackup(input, u.id_usuario); }
  @Mutation(() => Boolean) restaurarBackup(@Args('input') input: RestaurarBackupInput, @CurrentUser() u: any): Promise<boolean> { return this.backupService.restaurarBackup(input, u.id_usuario); }
  @Mutation(() => BackupConfig) configurarBackupAutomatico(@Args('input') input: ConfigBackupAutoInput, @CurrentUser() u: any): Promise<BackupConfig> { return this.backupService.configurarAutomatico(input, u.id_usuario); }
}
