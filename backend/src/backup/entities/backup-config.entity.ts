import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@ObjectType()
@Entity('Backup_Config')
export class BackupConfig {
  @Field(() => Int) @PrimaryGeneratedColumn() id: number;
  @Field() @Column({ type: 'nvarchar', length: 20 }) tipo: string;
  @Field() @Column({ type: 'nvarchar', length: 10 }) formato: string;
  @Field(() => Int) @Column({ type: 'int', default: 24 }) frecuencia_horas: number;
  @Field() @Column({ type: 'bit', default: 1 }) activo: boolean;
  @Field({ nullable: true }) @Column({ type: 'datetime2', nullable: true }) ultima_ejecucion?: Date;
}
