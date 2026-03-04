import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './rol.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rol])],
  exports: [TypeOrmModule],
})
export class RolModule {}
