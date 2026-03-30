import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
@ObjectType()
@Entity('Backup_Log')
export class BackupLog {
  @Field(() => Int) @PrimaryGeneratedColumn() id_backup: number;
  @Field() @Column({ type: 'nvarchar', length: 20 }) tipo: string;
  @Field() @Column({ type: 'nvarchar', length: 10 }) formato: string;
  @Field() @Column({ type: 'nvarchar', length: 255 }) nombre_archivo: string;
  @Field(() => Int, { nullable: true }) @Column({ type: 'int', nullable: true }) tamanio_kb?: number;
  @Field() @Column({ type: 'nvarchar', length: 15 }) modo: string;
  @Field() @CreateDateColumn({ type: 'datetime2' }) created_at: Date;
}
