import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { readFileSync } from 'fs';
import * as mysql2 from 'mysql2/promise';
import { runSeed } from './seed/seed';

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

async function initDatabase(config: ConfigService): Promise<void> {
  // ── 1. Crear BD y tablas (idempotente) ──────────────────────────
  const connInit = await mysql2.createConnection({
    host:               config.get('DB_HOST', 'localhost'),
    port:               +config.get('DB_PORT', 3306),
    user:               config.get('DB_USER', 'root'),
    password:           config.get('DB_PASSWORD', ''),
    multipleStatements: true,
  });

  try {
    const sqlPath = join(process.cwd(), 'src', 'database', 'init.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    await connInit.query(sql);
    console.log('Base de datos inicializada correctamente.');
  } finally {
    await connInit.end();
  }

  // ── 2. Seed automático solo si la BD está vacía ─────────────────
  const connSeed = await mysql2.createConnection({
    host:               config.get('DB_HOST', 'localhost'),
    port:               +config.get('DB_PORT', 3306),
    user:               config.get('DB_USER', 'root'),
    password:           config.get('DB_PASSWORD', ''),
    database:           config.get('DB_NAME', 'unimente'),
    multipleStatements: true,
  });

  try {
    const [[{ total }]] = await connSeed.query<any>(
      'SELECT COUNT(*) AS total FROM Psicologo',
    );
    if (Number(total) === 0) {
      console.log('BD vacía — ejecutando seed de datos de prueba...');
      await runSeed(connSeed);
    } else {
      console.log(`BD ya tiene datos (${total} psicólogos). Seed omitido.`);
    }
  } finally {
    await connSeed.end();
  }
}

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
      useFactory: async (config: ConfigService) => {
        await initDatabase(config);
        return {
          type:        'mysql',
          host:        config.get('DB_HOST', 'localhost'),
          port:        +config.get('DB_PORT', 3306),
          username:    config.get('DB_USER', 'root'),
          password:    config.get('DB_PASSWORD', ''),
          database:    config.get('DB_NAME', 'unimente'),
          entities:    [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          logging:     false,
          charset:     'utf8mb4',
        };
      },
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