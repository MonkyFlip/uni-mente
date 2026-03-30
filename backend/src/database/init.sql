-- =============================================================
--  UniMente — Inicialización T-SQL (SQL Server 2022)
--  Idempotente: IF OBJECT_ID(...) IS NULL en todas las tablas.
--  Separar batches con GO para la ejecución desde Node.js.
-- =============================================================

-- Crear base de datos si no existe
IF DB_ID('unimente') IS NULL
  CREATE DATABASE unimente COLLATE SQL_Latin1_General_CP1_CI_AS;
GO

USE unimente;
GO

-- ─── Rol ──────────────────────────────────────────────────────
IF OBJECT_ID('dbo.Rol','U') IS NULL
  CREATE TABLE dbo.Rol (
    id_rol  INT          NOT NULL IDENTITY(1,1),
    nombre  NVARCHAR(50) NOT NULL,
    CONSTRAINT PK_Rol        PRIMARY KEY (id_rol),
    CONSTRAINT UQ_Rol_nombre UNIQUE      (nombre)
  );
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Rol WHERE nombre='administrador') INSERT INTO dbo.Rol (nombre) VALUES ('administrador');
IF NOT EXISTS (SELECT 1 FROM dbo.Rol WHERE nombre='psicologo')     INSERT INTO dbo.Rol (nombre) VALUES ('psicologo');
IF NOT EXISTS (SELECT 1 FROM dbo.Rol WHERE nombre='estudiante')    INSERT INTO dbo.Rol (nombre) VALUES ('estudiante');
GO

-- ─── Usuario ──────────────────────────────────────────────────
IF OBJECT_ID('dbo.Usuario','U') IS NULL
  CREATE TABLE dbo.Usuario (
    id_usuario    INT            NOT NULL IDENTITY(1,1),
    nombre        NVARCHAR(150)  NOT NULL,
    correo        NVARCHAR(120)  NOT NULL,
    password_hash NVARCHAR(255)  NOT NULL,
    id_rol        INT            NOT NULL,
    created_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
    mfa_secret    NVARCHAR(255)  NULL,
    mfa_enabled   BIT            NOT NULL DEFAULT 0,
    CONSTRAINT PK_Usuario       PRIMARY KEY (id_usuario),
    CONSTRAINT UQ_Usuario_correo UNIQUE (correo),
    CONSTRAINT FK_Usuario_Rol   FOREIGN KEY (id_rol) REFERENCES dbo.Rol(id_rol)
  );
GO

-- Migración segura MFA (no destruye datos si la tabla ya existe)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='Usuario' AND COLUMN_NAME='mfa_secret'
) ALTER TABLE dbo.Usuario ADD mfa_secret NVARCHAR(255) NULL;
GO

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='Usuario' AND COLUMN_NAME='mfa_enabled'
) ALTER TABLE dbo.Usuario ADD mfa_enabled BIT NOT NULL DEFAULT 0;
GO

-- ─── Estudiante ───────────────────────────────────────────────
IF OBJECT_ID('dbo.Estudiante','U') IS NULL
  CREATE TABLE dbo.Estudiante (
    id_estudiante INT           NOT NULL IDENTITY(1,1),
    id_usuario    INT           NOT NULL,
    matricula     NVARCHAR(20)  NULL,
    carrera       NVARCHAR(100) NULL,
    telefono      NVARCHAR(20)  NULL,
    CONSTRAINT PK_Estudiante          PRIMARY KEY (id_estudiante),
    CONSTRAINT UQ_Estudiante_usuario  UNIQUE      (id_usuario),
    CONSTRAINT FK_Estudiante_Usuario  FOREIGN KEY (id_usuario) REFERENCES dbo.Usuario(id_usuario) ON DELETE CASCADE
  );
GO

-- ─── Psicologo ────────────────────────────────────────────────
IF OBJECT_ID('dbo.Psicologo','U') IS NULL
  CREATE TABLE dbo.Psicologo (
    id_psicologo  INT           NOT NULL IDENTITY(1,1),
    id_usuario    INT           NOT NULL,
    especialidad  NVARCHAR(100) NOT NULL,
    cedula        NVARCHAR(50)  NULL,
    telefono      NVARCHAR(20)  NULL,
    CONSTRAINT PK_Psicologo          PRIMARY KEY (id_psicologo),
    CONSTRAINT UQ_Psicologo_usuario  UNIQUE      (id_usuario),
    CONSTRAINT FK_Psicologo_Usuario  FOREIGN KEY (id_usuario) REFERENCES dbo.Usuario(id_usuario) ON DELETE CASCADE
  );
GO

-- ─── Horario_Psicologo ────────────────────────────────────────
IF OBJECT_ID('dbo.Horario_Psicologo','U') IS NULL
  CREATE TABLE dbo.Horario_Psicologo (
    id_horario   INT           NOT NULL IDENTITY(1,1),
    id_psicologo INT           NOT NULL,
    dia_semana   NVARCHAR(15)  NOT NULL,
    hora_inicio  TIME          NOT NULL,
    hora_fin     TIME          NOT NULL,
    disponible   BIT           NOT NULL DEFAULT 1,
    CONSTRAINT PK_Horario     PRIMARY KEY (id_horario),
    CONSTRAINT FK_Horario_Psi FOREIGN KEY (id_psicologo) REFERENCES dbo.Psicologo(id_psicologo) ON DELETE CASCADE
  );
GO

-- ─── Cita ─────────────────────────────────────────────────────
IF OBJECT_ID('dbo.Cita','U') IS NULL
  CREATE TABLE dbo.Cita (
    id_cita       INT           NOT NULL IDENTITY(1,1),
    id_estudiante INT           NOT NULL,
    id_psicologo  INT           NOT NULL,
    fecha         DATE          NOT NULL,
    hora_inicio   TIME          NOT NULL,
    hora_fin      TIME          NOT NULL,
    estado        NVARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    motivo        NVARCHAR(MAX) NULL,
    created_at    DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Cita        PRIMARY KEY (id_cita),
    CONSTRAINT UQ_Cita_slot   UNIQUE      (id_psicologo, fecha, hora_inicio),
    CONSTRAINT FK_Cita_Est    FOREIGN KEY (id_estudiante) REFERENCES dbo.Estudiante(id_estudiante),
    CONSTRAINT FK_Cita_Psi    FOREIGN KEY (id_psicologo)  REFERENCES dbo.Psicologo(id_psicologo)
  );
GO

-- ─── Sesion ───────────────────────────────────────────────────
IF OBJECT_ID('dbo.Sesion','U') IS NULL
  CREATE TABLE dbo.Sesion (
    id_sesion       INT           NOT NULL IDENTITY(1,1),
    id_cita         INT           NOT NULL,
    numero_sesion   INT           NOT NULL DEFAULT 1,
    notas           NVARCHAR(MAX) NULL,
    recomendaciones NVARCHAR(MAX) NULL,
    fecha_registro  DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Sesion      PRIMARY KEY (id_sesion),
    CONSTRAINT UQ_Sesion_cita UNIQUE      (id_cita),
    CONSTRAINT FK_Sesion_Cita FOREIGN KEY (id_cita) REFERENCES dbo.Cita(id_cita) ON DELETE CASCADE
  );
GO

-- ─── Historial_Clinico ────────────────────────────────────────
IF OBJECT_ID('dbo.Historial_Clinico','U') IS NULL
  CREATE TABLE dbo.Historial_Clinico (
    id_historial   INT      NOT NULL IDENTITY(1,1),
    id_estudiante  INT      NOT NULL,
    id_psicologo   INT      NOT NULL,
    fecha_apertura DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Historial     PRIMARY KEY (id_historial),
    CONSTRAINT UQ_Historial     UNIQUE      (id_estudiante, id_psicologo),
    CONSTRAINT FK_Hist_Est      FOREIGN KEY (id_estudiante) REFERENCES dbo.Estudiante(id_estudiante),
    CONSTRAINT FK_Hist_Psi      FOREIGN KEY (id_psicologo)  REFERENCES dbo.Psicologo(id_psicologo)
  );
GO

-- ─── Detalle_Historial ────────────────────────────────────────
IF OBJECT_ID('dbo.Detalle_Historial','U') IS NULL
  CREATE TABLE dbo.Detalle_Historial (
    id_detalle     INT      NOT NULL IDENTITY(1,1),
    id_historial   INT      NOT NULL,
    id_sesion      INT      NOT NULL,
    fecha_registro DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Detalle         PRIMARY KEY (id_detalle),
    CONSTRAINT UQ_Detalle_sesion  UNIQUE      (id_sesion),
    CONSTRAINT FK_Det_Hist        FOREIGN KEY (id_historial) REFERENCES dbo.Historial_Clinico(id_historial) ON DELETE CASCADE,
    CONSTRAINT FK_Det_Sesion      FOREIGN KEY (id_sesion)    REFERENCES dbo.Sesion(id_sesion)
  );
GO

-- ─── Backup_Log ───────────────────────────────────────────────
IF OBJECT_ID('dbo.Backup_Log','U') IS NULL
  CREATE TABLE dbo.Backup_Log (
    id_backup      INT           NOT NULL IDENTITY(1,1),
    tipo           NVARCHAR(20)  NOT NULL,
    formato        NVARCHAR(10)  NOT NULL,
    nombre_archivo NVARCHAR(255) NOT NULL,
    tamanio_kb     INT           NULL,
    modo           NVARCHAR(15)  NOT NULL DEFAULT 'MANUAL',
    created_at     DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_BackupLog PRIMARY KEY (id_backup)
  );
GO

-- ─── Backup_Config ────────────────────────────────────────────
IF OBJECT_ID('dbo.Backup_Config','U') IS NULL
  CREATE TABLE dbo.Backup_Config (
    id               INT          NOT NULL IDENTITY(1,1),
    tipo             NVARCHAR(20) NOT NULL DEFAULT 'COMPLETO',
    formato          NVARCHAR(10) NOT NULL DEFAULT 'SQL',
    frecuencia_horas INT          NOT NULL DEFAULT 24,
    activo           BIT          NOT NULL DEFAULT 1,
    ultima_ejecucion DATETIME2    NULL,
    CONSTRAINT PK_BackupConfig PRIMARY KEY (id)
  );
GO
