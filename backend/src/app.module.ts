/**
 * app.module.ts
 *
 * OWASP mitigations:
 *  A07 Auth Failures    → ThrottlerModule (rate limiting global)
 *  A02 Crypto Failures  → conexión MSSQL con encrypt:true en producción
 *  A05 Misconfig        → synchronize:false siempre (migraciones explícitas)
 */

import { Module }             from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { GraphQLModule }      from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule }     from '@nestjs/schedule';
import { ThrottlerModule }    from '@nestjs/throttler';
import { join }               from 'path';
import * as mssql             from 'mssql';
import { readFileSync }       from 'fs';

import { RolModule }              from './rol/rol.module';
import { UsuarioModule }          from './usuario/usuario.module';
import { AuthModule }             from './auth/auth.module';
import { EstudianteModule }       from './estudiante/estudiante.module';
import { PsicologoModule }        from './psicologo/psicologo.module';
import { HorarioPsicologoModule } from './horario-psicologo/horario-psicologo.module';
import { CitaModule }             from './cita/cita.module';
import { SesionModule }           from './sesion/sesion.module';
import { HistorialClinicoModule } from './historial-clinico/historial-clinico.module';
import { DetalleHistorialModule } from './detalle-historial/detalle-historial.module';
import { MfaModule }              from './mfa/mfa.module';
import { BackupModule }           from './backup/backup.module';
import { runSeed }                from './seed/seed';

async function initDatabase(cfg: ConfigService): Promise<void> {
  const isProd = cfg.get('NODE_ENV') === 'production';

  // Conexión sin base de datos para crear unimente si no existe
  const pool = await mssql.connect({
    server:   cfg.get('DB_HOST',     'localhost'),
    port:     +cfg.get('DB_PORT',    1433),
    user:     cfg.get('DB_USER',     'sa'),
    password: cfg.get('DB_PASSWORD', ''),
    database: 'master',
    options: {
      trustServerCertificate: !isProd,  // A02: solo false en producción (certificado real)
      encrypt: isProd,
      enableArithAbort: true,
    },
    pool: { max: 1, min: 1 },
  });

  try {
    // Crear BD si no existe
    const sqlPath = join(process.cwd(), 'src', 'database', 'init.sql');
    const sql     = readFileSync(sqlPath, 'utf8');

    // T-SQL permite múltiples statements; ejecutar bloque a bloque separando por GO
    const batches = sql.split(/^\s*GO\s*$/im).filter(b => b.trim());
    for (const batch of batches) {
      await pool.request().query(batch);
    }

    console.log('Base de datos MSSQL inicializada correctamente.');

    // Auto-seed si la tabla Psicologo está vacía
    const res = await pool.request().query('SELECT COUNT(*) AS total FROM unimente.dbo.Psicologo');
    const total = Number(res.recordset[0]?.total ?? 0);
    if (total === 0) {
      console.log('BD vacia — ejecutando seed de datos de prueba...');
      await runSeed(pool, cfg);
    } else {
      console.log(`BD ya tiene datos (${total} psicologos). Seed omitido.`);
    }
  } finally {
    await pool.close();
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    // ─── A07: Rate limiting global ────────────────────────────────────────
    ThrottlerModule.forRoot([{
      name:    'global',
      ttl:     60_000,   // ventana de 60 segundos
      limit:   60,       // máx. 60 peticiones por IP por ventana
    }]),

    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: async (cfg: ConfigService) => {
        await initDatabase(cfg);
        const isProd = cfg.get('NODE_ENV') === 'production';
        return {
          type:     'mssql',
          host:     cfg.get('DB_HOST',     'localhost'),
          port:     +cfg.get('DB_PORT',    1433),
          username: cfg.get('DB_USER',     'sa'),
          password: cfg.get('DB_PASSWORD', ''),
          database: cfg.get('DB_NAME',     'unimente'),
          // A02: encrypt=true en producción (TLS obligatorio)
          options:  { trustServerCertificate: !isProd, encrypt: isProd, enableArithAbort: true },
          synchronize:      false,   // A05: NUNCA true en producción
          autoLoadEntities: true,
          requestTimeout:   30_000,
        };
      },
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver:        ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema:    true,
      playground:    false,
      introspection: process.env.NODE_ENV !== 'production', // A05: off en prod
      // A09: no incluir stacktrace en errores de GraphQL en producción
      formatError: (err) => {
        if (process.env.NODE_ENV === 'production') {
          return { message: err.message, locations: err.locations, path: err.path };
        }
        return err;
      },
    }),

    RolModule, UsuarioModule, AuthModule,
    EstudianteModule, PsicologoModule, HorarioPsicologoModule,
    CitaModule, SesionModule, HistorialClinicoModule, DetalleHistorialModule,
    MfaModule, BackupModule,
  ],
})
export class AppModule {}
