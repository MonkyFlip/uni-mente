import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BackupLog } from './entities/backup-log.entity';
import { BackupConfig } from './entities/backup-config.entity';
import { BackupService } from './backup.service';
import { BackupResolver } from './backup.resolver';
import { EmergencyRestoreController } from './emergency-restore.controller';
import { MfaModule } from '../mfa/mfa.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([BackupLog, BackupConfig]),
    MfaModule,
  ],
  controllers: [EmergencyRestoreController],
  providers:   [BackupService, BackupResolver],
  exports:     [BackupService],
})
export class BackupModule {}