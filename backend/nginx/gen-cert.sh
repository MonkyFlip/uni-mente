#!/bin/bash
# Genera certificado autofirmado para la EC2
# Ejecutar UNA SOLA VEZ en la EC2 antes del primer docker compose up --build

mkdir -p certs

openssl req -x509 -nodes -days 3650 \
  -newkey rsa:2048 \
  -keyout certs/server.key \
  -out    certs/server.crt \
  -subj "/C=MX/ST=CDMX/L=CDMX/O=UniMente/CN=unimente-backend"

echo "Certificado generado en certs/server.crt y certs/server.key"