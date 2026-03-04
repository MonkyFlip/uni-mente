---

# UniMente — Monorepo (Frontend + Backend)

Este repositorio contiene el **frontend** y el **backend** del proyecto **UniMente**, organizados en un **monorepo** para facilitar el desarrollo, la sincronización de cambios y la entrega académica.

La arquitectura está dividida en dos aplicaciones independientes:

- **Frontend**: React + TypeScript + Vite  
- **Backend**: NestJS + GraphQL + TypeScript  

Ambas viven en un mismo repositorio, pero se ejecutan y mantienen por separado.

---

## 📁 Estructura del proyecto

```
UniMente/
├── backend/        # API con NestJS + GraphQL
│   ├── src/
│   ├── package.json
│   └── ...
│
├── frontend/       # Aplicación web con React + TS
│   ├── src/
│   ├── package.json
│   └── ...
│
└── README.md
```

Cada carpeta contiene su propio proyecto Node.js, con dependencias y scripts independientes.

---

## 🚀 Tecnologías principales

### Backend (NestJS)
- NestJS
- GraphQL (Apollo Server)
- TypeScript
- Arquitectura modular
- Hot reload con `start:dev`

### Frontend (React)
- React + TypeScript
- Vite
- Apollo Client
- Componentes modulares

---

## ▶️ Cómo ejecutar el proyecto

### 1) Clonar el repositorio
```bash
git clone https://github.com/<organizacion>/UniMente.git
cd UniMente
```

---

## 🛠️ Backend (NestJS)

### Instalar dependencias
```bash
cd backend
npm install
```

### Ejecutar en modo desarrollo
```bash
npm run start:dev
```

### Endpoint GraphQL
Una vez corriendo:

```
http://localhost:3000/graphql
```

Aquí puedes probar queries y mutations.

---

## 🖥️ Frontend (React + Vite)

### Instalar dependencias
```bash
cd frontend
npm install
```

### Ejecutar en modo desarrollo
```bash
npm run dev
```

### URL de desarrollo
```
http://localhost:5173
```

---

## 🔗 Comunicación Frontend ↔ Backend

El frontend se conecta al backend mediante Apollo Client, apuntando al endpoint:

```
http://localhost:3000/graphql
```

Asegúrate de que el backend esté corriendo antes de abrir el frontend.

---

## 📦 Scripts útiles

### Backend
- `npm run start` — Ejecuta la API
- `npm run start:dev` — Modo desarrollo con recarga automática
- `npm run build` — Compila a producción

### Frontend
- `npm run dev` — Servidor de desarrollo
- `npm run build` — Compila la app
- `npm run preview` — Previsualiza la build

---

## 🧩 Convenciones del monorepo

- Cada proyecto tiene su propio `package.json`.
- No se comparten `node_modules`.
- Los commits deben describir cambios en **frontend**, **backend** o ambos.
- La raíz del repo **no** contiene código ejecutable, solo organización.

---

## 📚 Objetivo del proyecto

UniMente busca desarrollar una plataforma modular que permita gestionar información académica mediante una arquitectura moderna basada en:

- UI reactiva con React
- API tipada con GraphQL
- Backend escalable con NestJS
- Buenas prácticas de separación de responsabilidades

---