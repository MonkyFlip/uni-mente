# UniMente — Dominio gratuito con DuckDNS + SSL real con Let's Encrypt

Este documento describe la configuración completa del dominio `unimente.duckdns.org`
con certificado SSL real de Let's Encrypt para el backend en AWS EC2.

Beneficios logrados:
- Dominio estable que no cambia aunque la EC2 apague y encienda
- SSL real (HTTPS sin advertencias en navegadores y apps móviles)
- Certificado aceptado por Google Play Store
- Renovación automática del certificado cada 90 días

---

## Estado actual

| Elemento | Valor |
|---|---|
| Dominio | `unimente.duckdns.org` |
| Proveedor DNS | DuckDNS (gratuito, sin registro, login con Google) |
| Certificado SSL | Let's Encrypt (válido 90 días, auto-renovable) |
| Renovación cert | Automática vía systemd timer de certbot |
| Actualización IP | Automática vía cron cada 5 minutos + al encender |

---

## Cómo funciona el ciclo de vida

### Al apagar y encender la EC2

```
EC2 se enciende → AWS asigna nueva IP dinámica
  │
  ├─ @reboot (espera 30 s) → ~/duckdns/duck.sh
  │    └─ DuckDNS actualizado con la nueva IP
  │         └─ unimente.duckdns.org → nueva IP ✓
  │
  └─ systemd: unimente.service
       └─ docker compose up -d
            ├─ unimente-sqlserver (healthy ~15 s)
            ├─ unimente-backend   (healthy ~60-90 s)
            └─ unimente-nginx     (SSL con cert Let's Encrypt ✓)
```

**Tiempo total hasta operativo:** ~3-5 minutos desde el encendido.
**Sin intervención manual** — ni actualizar IPs, ni tocar archivos, ni reiniciar contenedores.

---

## Configuración realizada (referencia)

### 1. Registro en DuckDNS

- URL: https://www.duckdns.org (login con Google)
- Subdominio creado: `unimente` → `unimente.duckdns.org`
- IP inicial: apuntada manualmente a la IP de la EC2 desde el dashboard

### 2. Script de actualización automática de IP

Ubicación en la EC2: `~/duckdns/duck.sh`

```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=unimente&token=TU_TOKEN&ip=" \
  | curl -sk -o ~/duckdns/duck.log -K -
```

Cron activo (`crontab -l`):
```
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
@reboot sleep 30 && ~/duckdns/duck.sh >/dev/null 2>&1
```

El `@reboot` garantiza que DuckDNS se actualice antes de que nginx empiece a recibir tráfico.

### 3. Instalaciones en la EC2

```bash
# cronie — necesario en Amazon Linux 2023 (no viene preinstalado)
sudo dnf install -y cronie
sudo systemctl enable crond
sudo systemctl start crond

# certbot — cliente de Let's Encrypt
sudo dnf install -y certbot
```

### 4. Certificado SSL obtenido

```bash
# Detener nginx temporalmente para liberar puerto 80
cd ~/unimente-backend/backend
docker compose stop nginx

# Obtener certificado
sudo certbot certonly --standalone \
  -d unimente.duckdns.org \
  --email miguelhercerv@gmail.com \
  --agree-tos \
  --non-interactive
```

Certificado almacenado en el host:
```
/etc/letsencrypt/live/unimente.duckdns.org/fullchain.pem
/etc/letsencrypt/live/unimente.duckdns.org/privkey.pem
```

Expira: **2026-07-04** (renovación automática por certbot systemd timer).

### 5. docker-compose.yml — nginx con volumen de Let's Encrypt

El servicio nginx monta `/etc/letsencrypt` del host dentro del contenedor:

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
    - /var/www/certbot:/var/www/certbot:ro
```

### 6. nginx.conf — rutas del certificado real

```nginx
ssl_certificate     /etc/letsencrypt/live/unimente.duckdns.org/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/unimente.duckdns.org/privkey.pem;
```

El bloque HTTP redirige a HTTPS y expone el webroot de certbot:
```nginx
server {
  listen 80;
  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }
  location / {
    return 301 https://$host$request_uri;
  }
}
```

---

## Verificar que todo funciona

```bash
# Certificado real (sin -k)
curl -s https://unimente.duckdns.org/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' \
  -w "\nHTTP: %{http_code}\n"
# HTTP: 200

# CORS correcto (una sola vez el header)
curl -sk -X OPTIONS https://unimente.duckdns.org/graphql \
  -H "Origin: https://aws.d1mrcwf1ifucba.amplifyapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -I | grep -i "access-control"

# DuckDNS apuntando a la IP correcta
curl -s https://api.ipify.org && echo
nslookup unimente.duckdns.org | grep Address
# Ambas deben mostrar la misma IP
```

---

## Actualizar el frontend y la app móvil

### frontend/src/apollo/client.ts

```typescript
export const GRAPHQL_URL  = 'https://unimente.duckdns.org/graphql';
export const API_BASE_URL = 'https://unimente.duckdns.org';
```

### mobile/app.json

```json
"extra": {
  "API_URL":      "https://unimente.duckdns.org/graphql",
  "API_REST_URL": "https://unimente.duckdns.org"
}
```

### .env de la EC2

```env
ALLOWED_ORIGINS=https://aws.d1mrcwf1ifucba.amplifyapp.com,https://unimente.duckdns.org,http://localhost:5173
```

Aplicar:
```bash
docker compose up -d --force-recreate backend
```

---

## Renovación del certificado

Certbot instala automáticamente un timer de systemd que renueva el certificado antes de que expire.

Verificar estado del timer:
```bash
sudo systemctl status certbot-renew.timer
# o
sudo systemctl list-timers | grep certbot
```

Activar si no está corriendo:
```bash
sudo systemctl enable --now certbot-renew.timer
```

Probar renovación manual (sin renovar de verdad):
```bash
sudo certbot renew --dry-run
```

Después de renovar, recargar nginx para que use el nuevo cert:
```bash
docker compose exec nginx nginx -s reload
```

Para automatizar el reload post-renovación, agregar al cron:
```bash
(crontab -l 2>/dev/null; echo "0 4 * * * docker compose -f /home/ec2-user/unimente-backend/backend/docker-compose.yml exec nginx nginx -s reload >/dev/null 2>&1") | crontab -
```

---

## Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| nginx `cannot load certificate` | Volumen `/etc/letsencrypt` no montado en el contenedor | Verificar volumes en docker-compose.yml + `docker compose up -d --force-recreate nginx` |
| `HTTP: 000` al hacer curl | nginx no está corriendo | `docker compose logs nginx --tail 10` |
| DuckDNS muestra IP incorrecta | El cron no corrió | `~/duckdns/duck.sh && cat ~/duckdns/duck.log` — debe decir `OK` |
| `KO` en duck.log | Token o subdominio incorrecto en duck.sh | `nano ~/duckdns/duck.sh` y verificar valores |
| certbot `No such authorization` | Puerto 80 cerrado en Security Group | Agregar regla HTTP:80 en unimente-security |
| Cert expirado | Timer de renovación no activo | `sudo systemctl enable --now certbot-renew.timer` |