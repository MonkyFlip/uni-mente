import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity('Backup_Config')
export class BackupConfig {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  /** COMPLETO | DIFERENCIAL | INCREMENTAL */
  @Field()
  @Column({ type: 'varchar', length: 20 })
  tipo: string;

  /** SQL | JSON | EXCEL | CSV */
  @Field()
  @Column({ type: 'varchar', length: 10 })
  formato: string;

  @Field(() => Int)
  @Column({ type: 'int', default: 24 })
  frecuencia_horas: number;

  @Field()
  @Column({ type: 'tinyint', default: 1 })
  activo: boolean;

  @Field({ nullable: true })
  @Column({ type: 'datetime', nullable: true })
  ultima_ejecucion?: Date;
}
