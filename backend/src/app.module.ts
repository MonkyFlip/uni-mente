import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { RolModule } from './rol/rol.module';
import { UsuarioModule } from './usuario/usuario.module';
import { EstudianteModule } from './estudiante/estudiante.module';
import { PsicologoModule } from './psicologo/psicologo.module';
import { HorarioPsicologoModule } from './horario-psicologo/horario-psicologo.module';
import { CitaModule } from './cita/cita.module';
import { SesionModule } from './sesion/sesion.module';
import { HistorialClinicoModule } from './historial-clinico/historial-clinico.module';
import { DetalleHistorialModule } from './detalle-historial/detalle-historial.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      context: ({ req }) => ({ req }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: +config.get('DB_PORT', 3306),
        username: config.get('DB_USER', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_NAME', 'unimente'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // ─── Cambia a false cuando las tablas ya estén creadas ───────────────
        synchronize: false,
        logging: false,
        charset: 'utf8mb4',
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    RolModule,
    UsuarioModule,
    EstudianteModule,
    PsicologoModule,
    HorarioPsicologoModule,
    CitaModule,
    SesionModule,
    HistorialClinicoModule,
    DetalleHistorialModule,
  ],
})
export class AppModule {}