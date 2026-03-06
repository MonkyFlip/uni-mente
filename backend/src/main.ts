import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded, Request, Response } from 'express';
import { AppModule } from './app.module';

const SANDBOX_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UniMente — GraphQL Sandbox</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; font-family: sans-serif; background: #0d1117; }
    #header {
      position: fixed; top: 0; left: 0; right: 0; z-index: 10;
      background: #161b22;
      border-bottom: 1px solid #30363d;
      padding: 0 20px;
      height: 48px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #header h1 { color: #58a6ff; font-size: 17px; font-weight: 700; }
    #header span { color: #8b949e; font-size: 13px; }
    #badge { background: #238636; color: #fff; font-size: 11px; padding: 2px 10px; border-radius: 12px; font-weight: 600; }
    #embedded-sandbox {
      position: fixed;
      top: 48px; left: 0; right: 0; bottom: 0;
    }
    #embedded-sandbox > div { height: 100% !important; }
  </style>
</head>
<body>
  <div id="header">
    <h1>UniMente API</h1>
    <span>http://localhost:3000/graphql</span>
    <span id="badge">GraphQL</span>
  </div>
  <div id="embedded-sandbox"></div>
  <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
  <script>
    new window.EmbeddedSandbox({
      target: '#embedded-sandbox',
      initialEndpoint: 'http://localhost:3000/graphql',
      includeCookies: false,
      initialState: {
        document: \`# Bienvenido a UniMente API\\n\\n# 1. Registrar estudiante (publico)\\nmutation RegistrarEstudiante {\\n  registrarEstudiante(input: {\\n    nombre: "Ana Lopez"\\n    correo: "ana@uni.edu"\\n    password: "Pass1234!"\\n    matricula: "2021001"\\n    carrera: "Psicologia"\\n  }) {\\n    id_estudiante\\n    usuario { nombre correo }\\n  }\\n}\\n\\n# 2. Login\\nmutation Login {\\n  login(input: {\\n    correo: "ana@uni.edu"\\n    password: "Pass1234!"\\n  }) {\\n    access_token\\n    rol\\n    nombre\\n  }\\n}\\n\\n# 3. Ver psicologos (requiere Bearer token en Headers)\\nquery Psicologos {\\n  psicologos {\\n    id_psicologo\\n    especialidad\\n    usuario { nombre }\\n    horarios { dia_semana hora_inicio hora_fin }\\n  }\\n}\`,
      },
    });
  </script>
</body>
</html>`;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Servir Apollo Sandbox embebido en GET /graphql
  app.use('/graphql', (req: Request, res: Response, next: Function) => {
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(SANDBOX_HTML);
    }
    next();
  });

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(3000);
  console.log('UniMente Backend corriendo en http://localhost:3000/graphql');
}
bootstrap();
