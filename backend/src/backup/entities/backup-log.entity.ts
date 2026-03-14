import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity('Backup_Log')
export class BackupLog {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id_backup: number;

  /** COMPLETO | DIFERENCIAL | INCREMENTAL */
  @Field()
  @Column({ type: 'varchar', length: 20 })
  tipo: string;

  /** SQL | JSON | EXCEL | CSV */
  @Field()
  @Column({ type: 'varchar', length: 10 })
  formato: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  nombre_archivo: string;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  tamanio_kb?: number;

  /** MANUAL | AUTOMATICO */
  @Field()
  @Column({ type: 'varchar', length: 15 })
  modo: string;

  @Field()
  @CreateDateColumn()
  created_at: Date;
}
