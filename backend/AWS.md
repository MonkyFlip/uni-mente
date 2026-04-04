# UniMente — Despliegue en AWS EC2

## Configuración de la instancia

| Parámetro | Valor |
|---|---|
| Instancia | c7i-flex.large |
| vCPU | 2 |
| RAM | 4 GB |
| SO | Amazon Linux 2023 (AMI ami-02f986bab3de34d0d) |
| Almacenamiento | 30 GiB gp3 |
| Security Group | unimente-security |
| IP pública | 18.190.217.141 |
| Par de claves | unimente-key |

---

## Reglas del Security Group (unimente-security)

| Tipo | Puerto | Origen | Propósito |
|---|---|---|---|
| SSH | 22 | Tu IP | Acceso inicial de configuración |
| TCP personalizado | 3000 | 0.0.0.0/0 | API backend (frontend Amplify → EC2) |

> **Puerto 1433 (SQL Server) NO debe estar expuesto.** Solo se comunica internamente entre contenedores Docker.

---

## Configuración inicial de la EC2 (solo una vez)

Conectarse vía SSH:
```bash
ssh -i unimente-key.pem ec2-user@18.190.217.141
```

### 1. Instalar Docker

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Instalar Docker Compose v2
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verificar
docker --version
docker compose version
```

> Cierra la sesión SSH y vuelve a entrar para que el grupo `docker` tome efecto:
> ```bash
> exit
> ssh -i unimente-key.pem ec2-user@18.190.217.141
> ```

---

### 2. Clonar el repositorio (rama aws)

```bash
cd ~
git clone -b aws https://github.com/MonkyFlip/uni-mente.git unimente
cd unimente/backend
```

---

### 3. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Editar los valores críticos de producción:

```env
DB_PASSWORD=TuPasswordSegura2026!
JWT_SECRET=<genera uno: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
RESTORE_SECRET=TuClaveDeEmergenciaSegura!
ALLOWED_ORIGINS=https://aws.d1mrcwf1ifucba.amplifyapp.com,http://localhost:5173
NODE_ENV=production
```

Guardar: `Ctrl+O`, `Enter`, `Ctrl+X`

---

### 4. Configurar auto-inicio con systemd

Esto hace que Docker Compose arranque automáticamente cuando la EC2 se encienda, sin necesitar intervención manual.

```bash
sudo nano /etc/systemd/system/unimente.service
```

Pegar exactamente esto:

```ini
[Unit]
Description=UniMente — Docker Compose (SQL Server + NestJS)
Documentation=https://github.com/MonkyFlip/uni-mente
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=ec2-user
WorkingDirectory=/home/ec2-user/unimente/backend
ExecStartPre=/usr/bin/docker compose pull --quiet --ignore-pull-failures
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down --remove-orphans
ExecReload=/usr/bin/docker compose restart
TimeoutStartSec=300
TimeoutStopSec=120
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

Guardar y activar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable unimente.service
sudo systemctl start unimente.service
```

Verificar que arrancó:

```bash
sudo systemctl status unimente.service
docker ps
```

---

### 5. Primera construcción y arranque

```bash
cd ~/unimente/backend
docker compose up --build -d
```

Monitorear el arranque (SQL Server tarda ~60s la primera vez):

```bash
docker compose logs -f
```

Cuando veas `UniMente Backend corriendo en http://localhost:3000/graphql`, el sistema está listo.

---

### 6. Verificar que el seed corrió

```bash
docker compose logs backend | grep -E "Seed|psicolog|Admin"
```

Debes ver algo como:
```
BD ya tiene datos (12 psicologos). Seed omitido.
```
o en el primer arranque:
```
Seed completado: Admins: 4 | Psicologos: 12 | Estudiantes: 100
```

---

### 7. Verificar CORS desde Amplify

Prueba en tu navegador o desde terminal:

```bash
curl -X POST http://18.190.217.141:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' \
  -o /dev/null -w "%{http_code}\n"
```

Debe devolver `200`.

---

## Ciclo de vida de la EC2

### Apagar sin perder datos

Desde la consola de AWS, simplemente **detén** la instancia (Stop, no Terminate). Los volúmenes EBS (incluyendo los datos de SQL Server) persisten aunque la instancia esté parada.

### Encender y esperar

Al encender la EC2, el servicio `systemd` ejecuta automáticamente `docker compose up -d`. El proceso es:

```
EC2 arranca
  └─ systemd inicia docker.service
       └─ systemd inicia unimente.service
            └─ docker compose up -d
                 ├─ contenedor db arranca (SQL Server ~60s en recuperarse)
                 │    └─ healthcheck pasa
                 └─ contenedor backend arranca (NestJS ~15s)
                      └─ Sistema listo ✓
```

Tiempo total desde encendido hasta operativo: **~2-4 minutos**.

---

## Actualizar el código

```bash
ssh -i unimente-key.pem ec2-user@18.190.217.141

cd ~/unimente
git pull origin aws

cd backend
docker compose up --build -d
```

Los datos de SQL Server NO se borran al rebuildar — están en el volumen `unimente_sqlserver_data`.

---

## Comandos de operación frecuentes

```bash
# Ver estado de contenedores
docker ps

# Ver logs en tiempo real
docker compose logs -f

# Ver solo logs del backend
docker compose logs -f backend

# Ver solo logs de SQL Server
docker compose logs -f db

# Reiniciar solo el backend (sin tocar SQL Server)
docker compose restart backend

# Detener todo (sin borrar datos)
docker compose down

# Detener y borrar volúmenes (BORRA DATOS — solo para reset total)
docker compose down -v
```

---

## Configuración del frontend (Apollo Client)

El frontend en Amplify debe apuntar al backend de la EC2. En `frontend/src/apollo/client.ts` debe estar:

```typescript
const httpLink = createHttpLink({
  uri: 'http://18.190.217.141:3000/graphql',
});
```

Si tienes un dominio con HTTPS, usar ese en vez de la IP directa.

---

## Arquitectura en producción

```
Internet
  │
  ├─ Frontend (AWS Amplify)
  │    https://aws.d1mrcwf1ifucba.amplifyapp.com
  │              │ GraphQL HTTP
  │              ▼
  └─ EC2 c7i-flex.large (18.190.217.141)
       Puerto 3000 (abierto en Security Group)
       │
       ├─ [Docker] unimente-backend (NestJS)
       │    ├─ Puerto 3000 → público
       │    └─ Red interna → db:1433
       │
       └─ [Docker] unimente-sqlserver
            ├─ Puerto 1433 → solo red interna (NO expuesto)
            └─ Volumen: unimente_sqlserver_data (persiste)
```

---

## Credenciales de acceso al sistema

| Rol | Correo | Contraseña (default) |
|---|---|---|
| Administrador | admin@unimente.edu | SEED_ADMIN_PASSWORD |
| Psicólogos | psicologo1..12@unimente.edu | SEED_DEFAULT_PASSWORD |
| Estudiantes | estudiante1..100@unimente.edu | SEED_DEFAULT_PASSWORD |

> Los valores reales son los que configuraste en `.env`.