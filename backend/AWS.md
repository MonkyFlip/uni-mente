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

---

### 1. Instalar Docker y Docker Compose

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
> ssh -i unimente-key.pem ec2-user@18.190.217.141
> ```

---

### 2. Clonar solo la carpeta backend (sparse checkout)

Git permite clonar únicamente un subdirectorio del repositorio sin descargar todo el proyecto. Esto mantiene la EC2 limpia y reduce el tiempo de clonado.

```bash
cd ~

# Inicializar repo vacío
git init unimente-backend
cd unimente-backend

# Conectar con el repositorio remoto
git remote add origin https://github.com/MonkyFlip/uni-mente.git

# Activar sparse checkout (solo descarga lo que indiques)
git sparse-checkout init --cone

# Especificar que solo quieres la carpeta backend
git sparse-checkout set backend

# Descargar la rama aws
git pull origin aws
```

Resultado: solo tendrás la carpeta `backend/` en `~/unimente-backend/backend/`.

Navegar al directorio de trabajo:
```bash
cd ~/unimente-backend/backend
ls
# Dockerfile  docker-compose.yml  src/  .env.example  ...
```

---

### 3. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Editar los valores críticos:

```env
DB_PASSWORD=TuPasswordSegura2026!
JWT_SECRET=<genera con el comando de abajo>
RESTORE_SECRET=TuClaveDeEmergenciaSegura!
ALLOWED_ORIGINS=https://aws.d1mrcwf1ifucba.amplifyapp.com,http://localhost:5173
NODE_ENV=production
```

Generar JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Guardar: `Ctrl+O`, `Enter`, `Ctrl+X`

---

### 4. Configurar auto-inicio con systemd

El servicio systemd ejecuta `docker compose up -d` automáticamente cada vez que la EC2 se encienda. No requiere intervención manual.

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
WorkingDirectory=/home/ec2-user/unimente-backend/backend
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
```

---

### 5. Primera construcción e inicio

```bash
cd ~/unimente-backend/backend
docker compose up --build -d
```

Monitorear el arranque (SQL Server tarda ~60 s la primera vez):

```bash
docker compose logs -f
```

El sistema está listo cuando aparezca:
```
UniMente Backend corriendo en http://localhost:3000/graphql
```

Verificar que el seed corrió:
```bash
docker compose logs backend | grep -E "Seed|psicolog|Admins"
```

---

### 6. Verificar funcionamiento

```bash
curl -X POST http://18.190.217.141:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' \
  -o /dev/null -w "%{http_code}\n"
# Debe devolver: 200
```

---

## Ciclo de vida de la EC2

### Flujo de arranque automático

```
EC2 se enciende
  └─ systemd inicia docker.service
       └─ systemd inicia unimente.service
            └─ docker compose up -d
                 ├─ unimente-sqlserver arranca
                 │    └─ healthcheck pasa (~60-90 s)
                 └─ unimente-backend arranca (~15 s)
                      └─ Sistema listo ✓
```

Tiempo total desde encendido hasta operativo: **~2-4 minutos**.

### Apagar sin perder datos

Desde la consola AWS: **Stop instance** (no Terminate).  
Los volúmenes EBS persisten. Los datos de SQL Server no se pierden.

---

## Actualizar el código

```bash
ssh -i unimente-key.pem ec2-user@18.190.217.141
cd ~/unimente-backend

# Descargar cambios (solo la carpeta backend de la rama aws)
git pull origin aws

cd backend
docker compose up --build -d
```

Los datos de SQL Server **no se borran** al rebuildar la imagen.

---

## Comandos de operación frecuentes

```bash
# Estado de contenedores
docker ps

# Logs en tiempo real
docker compose logs -f

# Solo backend / solo base de datos
docker compose logs -f backend
docker compose logs -f db

# Reiniciar solo el backend
docker compose restart backend

# Detener todo sin borrar datos
docker compose down

# Reset total (BORRA TODOS LOS DATOS)
docker compose down -v
```

---

## Arquitectura en producción

```
Internet
  │
  ├─ Frontend ─ AWS Amplify
  │    https://aws.d1mrcwf1ifucba.amplifyapp.com
  │              │  HTTP :3000/graphql
  │              ▼
  └─ EC2 c7i-flex.large — 18.190.217.141
       Puerto 3000 abierto en Security Group
       │
       ├─ [Docker] unimente-backend   (NestJS · 512-768 MB)
       │    Puerto 3000 → público
       │    Red interna → db:1433
       │
       └─ [Docker] unimente-sqlserver (SQL Server 2022 · 2.4 GB)
            Puerto 1433 → solo red interna
            Volumen EBS → unimente_sqlserver_data (persiste)
```

---

## Credenciales de acceso

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@unimente.edu | `SEED_ADMIN_PASSWORD` del .env |
| Psicólogos | psicologo1..12@unimente.edu | `SEED_DEFAULT_PASSWORD` del .env |
| Estudiantes | estudiante1..100@unimente.edu | `SEED_DEFAULT_PASSWORD` del .env |