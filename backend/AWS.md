# UniMente — Despliegue en AWS EC2

## Configuración de la instancia

| Parámetro | Valor |
|---|---|
| Nombre | UniMente |
| Instancia | c7i-flex.large |
| vCPU / RAM | 2 vCPU / 4 GB |
| SO | Amazon Linux 2023 (AMI ami-02f986bab3de34d0d) |
| Almacenamiento | 30 GiB gp3 |
| Security Group | unimente-security |
| Par de claves | unimente-key |

---

## Reglas del Security Group (unimente-security)

| Tipo | Puerto | Origen | Propósito |
|---|---|---|---|
| SSH | 22 | Tu IP | Acceso de administración |
| TCP | 80 | 0.0.0.0/0 | HTTP → redirige a HTTPS |
| TCP | 443 | 0.0.0.0/0 | HTTPS nginx → NestJS |

> **Puerto 1433 (SQL Server) y 3000 (NestJS) NO expuestos.** Solo accesibles dentro de la red Docker interna.

---

## Arquitectura de contenedores

```
Internet (HTTPS :443)
        │
   unimente-nginx          (nginx:1.27-alpine)
   SSL termination         Redirige HTTP→HTTPS
   CORS handler            Reverse proxy a NestJS
        │
   unimente-backend        (node:20.14-alpine, multi-stage)
   NestJS + Apollo GraphQL Puerto interno 3000
        │
   unimente-sqlserver      (mssql/server:2022-CU13)
   SQL Server 2022         Puerto interno 1433
   Volumen: unimente_sqlserver_data
```

El tráfico público nunca llega directamente a NestJS ni a SQL Server — siempre pasa por nginx.

---

## Configuración inicial (solo una vez)

### 1. Conectarse por SSH

```bash
ssh -i unimente-key.pem ec2-user@<IP_PUBLICA>
```

### 2. Instalar Docker y Docker Compose

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Docker Compose v2
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verificar
docker --version
docker compose version
```

> Cierra la sesión y vuelve a entrar para que el grupo `docker` aplique:
> ```bash
> exit
> ssh -i unimente-key.pem ec2-user@<IP_PUBLICA>
> ```

### 3. Clonar solo la carpeta backend (sparse checkout)

```bash
cd ~
git init unimente-backend
cd unimente-backend
git remote add origin https://github.com/MonkyFlip/uni-mente.git
git sparse-checkout init --cone
git sparse-checkout set backend
git pull origin aws
cd backend
```

### 4. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Valores críticos a cambiar:

```env
DB_PASSWORD=TuPasswordSegura2026!
JWT_SECRET=<genera: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
RESTORE_SECRET=TuClaveDeEmergenciaSegura!
ALLOWED_ORIGINS=https://aws.d1mrcwf1ifucba.amplifyapp.com,http://localhost:5173
NODE_ENV=production
```

Guardar: `Ctrl+O` → `Enter` → `Ctrl+X`

### 5. Generar certificado SSL autofirmado

```bash
cd nginx
chmod +x gen-cert.sh
./gen-cert.sh
cd ..
```

Verifica que se creó:

```bash
ls nginx/certs/
# server.crt  server.key
```

### 6. Configurar auto-inicio con systemd

```bash
sudo nano /etc/systemd/system/unimente.service
```

Pegar exactamente:

```ini
[Unit]
Description=UniMente — Docker Compose (SQL Server + NestJS + Nginx)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=ec2-user
WorkingDirectory=/home/ec2-user/unimente-backend/backend
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down --remove-orphans
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
```

### 7. Primera construcción e inicio

```bash
docker compose up --build -d
docker compose logs -f
```

Esperar hasta ver:
```
UniMente Backend corriendo en http://localhost:3000/graphql
```

SQL Server tarda ~60 s en iniciar la primera vez. El backend espera automáticamente.

### 8. Verificar que el sistema funciona

```bash
# Verificar contenedores
docker ps

# Verificar GraphQL vía nginx SSL
curl -sk https://localhost/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' \
  -w "\nHTTP: %{http_code}\n"
# Debe devolver HTTP: 200

# Verificar CORS desde Amplify
curl -sk -X OPTIONS https://localhost/graphql \
  -H "Origin: https://aws.d1mrcwf1ifucba.amplifyapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -I | grep -i "access-control"
```

### 9. Verificar seed de datos

```bash
docker compose logs backend | grep -E "Seed|psicolog|Admins|omitido"
```

---

## IP dinámica — acción requerida tras encender la EC2

La IP pública cambia cada vez que la instancia se apaga y vuelve a encender.

**Después de encender la EC2:**

1. Ve a la consola AWS → EC2 → Instancias → selecciona `UniMente`
2. Copia la nueva **Dirección IPv4 pública**
3. Actualiza `frontend/src/apollo/client.ts`:
   ```typescript
   uri: 'https://<NUEVA_IP>/graphql'
   ```
4. Commit y push a la rama `aws` → Amplify redespliega automáticamente en ~2 min

> **Solución permanente:** asigna una **Elastic IP** en la consola AWS (gratis mientras la instancia esté encendida, cobra ~$0.005/hr cuando está apagada).

---

## Aplicar nuevos cambios del repositorio

Cuando hagas cambios en local y los subas a la rama `aws`:

```bash
ssh -i unimente-key.pem ec2-user@<IP_PUBLICA>
cd ~/unimente-backend

# Descargar cambios
git pull origin aws

cd backend

# Si solo cambiaron archivos de frontend o config (no código backend):
docker compose up -d

# Si cambió código del backend (src/, package.json, Dockerfile):
docker compose up --build -d backend

# Si cambió nginx.conf:
docker compose exec nginx nginx -t        # verificar sintaxis
docker compose exec nginx nginx -s reload # recargar sin cortar tráfico

# Si cambió docker-compose.yml:
docker compose down
docker compose up -d
```

Los datos de SQL Server **nunca se borran** al rebuildar — están en el volumen `unimente_sqlserver_data` que persiste independientemente.

---

## Ciclo de vida de la EC2

### Flujo de arranque automático

```
EC2 se enciende
  └─ systemd: docker.service
       └─ systemd: unimente.service
            └─ docker compose up -d
                 ├─ unimente-sqlserver arranca (~60 s, healthcheck)
                 ├─ unimente-backend arranca (espera healthcheck de db)
                 │    └─ NestJS inicializa BD + verifica seed
                 └─ unimente-nginx arranca
                      └─ Sistema listo ✓
```

Tiempo total desde encendido hasta operativo: **~3-5 minutos**

### Apagar sin perder datos

Desde la consola AWS: **Stop instance** (no Terminate). Los volúmenes EBS persisten.

---

## Operación diaria

```bash
# Ver estado
docker ps

# Logs en tiempo real
docker compose logs -f
docker compose logs -f backend   # solo backend
docker compose logs -f nginx     # solo nginx

# Reiniciar un solo servicio
docker compose restart backend
docker compose restart nginx

# Detener todo (sin borrar datos)
docker compose down

# RESET TOTAL — borra todos los datos
docker compose down -v
```

---

## Troubleshooting frecuente

| Síntoma | Causa | Solución |
|---|---|---|
| Backend `unhealthy` pero corriendo | Healthcheck tardó más del start_period | `docker compose up -d` (reintenta) |
| Nginx `cannot load certificate` | Certs en ruta incorrecta | `ls nginx/certs/` y mover si es necesario |
| CORS `multiple values` | NestJS + Apollo duplicaban header | nginx usa `proxy_hide_header` y pone el header una vez |
| `SEED_* no configurada` | Variable faltante en .env | Agregar al .env y `docker compose up -d --force-recreate backend` |
| `self-signed certificate` | `DB_TRUST_CERT` no está en `true` | Verificar `.env` y recrear el backend |
| `git pull` rechazado | Cambios locales en EC2 | `git stash && git pull origin aws && git stash drop` |

---

## Credenciales del sistema (seed)

| Rol | Correo | Variable en .env |
|---|---|---|
| Administrador principal | admin@unimente.edu | `SEED_ADMIN_PASSWORD` |
| Admin Brenda | brendaAdmin@unimente.com | `SEED_ADMIN_BRENDA_PASSWORD` |
| Admin Abril | abrilAdmin@unimente.com | `SEED_ADMIN_ABRIL_PASSWORD` |
| Admin Mai | maiAdmin@unimente.com | `SEED_ADMIN_MAI_PASSWORD` |
| Psicólogos 1-12 | psicologo1..12@unimente.edu | `SEED_DEFAULT_PASSWORD` |
| Estudiantes 1-100 | estudiante1..100@unimente.edu | `SEED_DEFAULT_PASSWORD` |