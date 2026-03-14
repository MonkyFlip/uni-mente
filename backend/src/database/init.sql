-- ================================================================
--  UniMente — Inicialización de base de datos (idempotente)
--  v5: agrega campos MFA en Usuario y tablas de Backup
-- ================================================================

CREATE DATABASE IF NOT EXISTS unimente
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE unimente;

-- ── Rol ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Rol (
  id_rol INT         NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  PRIMARY KEY (id_rol),
  UNIQUE KEY UQ_Rol_nombre (nombre)
) ENGINE=InnoDB;

INSERT IGNORE INTO Rol (nombre) VALUES ('administrador'), ('psicologo'), ('estudiante');

-- ── Usuario ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Usuario (
  id_usuario    INT          NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  correo        VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  id_rol        INT          NOT NULL,
  mfa_secret    VARCHAR(255) NULL     COMMENT 'Secreto TOTP base32',
  mfa_enabled   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1=MFA activo',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY UQ_Usuario_correo (correo),
  CONSTRAINT FK_Usuario_Rol FOREIGN KEY (id_rol) REFERENCES Rol (id_rol)
) ENGINE=InnoDB;

-- Migración segura: agrega columnas MFA si ya existe la tabla
DROP PROCEDURE IF EXISTS _agregar_mfa;
CREATE PROCEDURE _agregar_mfa()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario'
                 AND COLUMN_NAME = 'mfa_secret') THEN
    ALTER TABLE Usuario ADD COLUMN mfa_secret  VARCHAR(255) NULL;
    ALTER TABLE Usuario ADD COLUMN mfa_enabled TINYINT(1)  NOT NULL DEFAULT 0;
  END IF;
END;
CALL _agregar_mfa();
DROP PROCEDURE IF EXISTS _agregar_mfa;

-- ── Estudiante ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Estudiante (
  id_estudiante INT          NOT NULL AUTO_INCREMENT,
  id_usuario    INT          NOT NULL,
  matricula     VARCHAR(20)  NULL,
  carrera       VARCHAR(100) NULL,
  telefono      VARCHAR(15)  NULL,
  PRIMARY KEY (id_estudiante),
  UNIQUE KEY UQ_Estudiante_usuario (id_usuario),
  CONSTRAINT FK_Estudiante_Usuario FOREIGN KEY (id_usuario)
    REFERENCES Usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Psicologo ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Psicologo (
  id_psicologo INT          NOT NULL AUTO_INCREMENT,
  id_usuario   INT          NOT NULL,
  especialidad VARCHAR(100) NULL,
  cedula       VARCHAR(20)  NULL,
  telefono     VARCHAR(15)  NULL,
  PRIMARY KEY (id_psicologo),
  UNIQUE KEY UQ_Psicologo_usuario (id_usuario),
  UNIQUE KEY UQ_Psicologo_cedula  (cedula),
  CONSTRAINT FK_Psicologo_Usuario FOREIGN KEY (id_usuario)
    REFERENCES Usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Horario_Psicologo ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Horario_Psicologo (
  id_horario   INT         NOT NULL AUTO_INCREMENT,
  id_psicologo INT         NOT NULL,
  dia_semana   VARCHAR(20) NOT NULL,
  hora_inicio  TIME        NOT NULL,
  hora_fin     TIME        NOT NULL,
  disponible   TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (id_horario),
  CONSTRAINT FK_Horario_Psicologo FOREIGN KEY (id_psicologo)
    REFERENCES Psicologo (id_psicologo) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Cita ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Cita (
  id_cita       INT         NOT NULL AUTO_INCREMENT,
  id_estudiante INT         NOT NULL,
  id_psicologo  INT         NOT NULL,
  fecha         DATE        NOT NULL,
  hora_inicio   TIME        NOT NULL,
  hora_fin      TIME        NOT NULL,
  estado        VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  motivo        TEXT        NULL,
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cita),
  UNIQUE KEY UQ_Cita_horario (id_psicologo, fecha, hora_inicio),
  CONSTRAINT FK_Cita_Estudiante FOREIGN KEY (id_estudiante)
    REFERENCES Estudiante (id_estudiante) ON DELETE CASCADE,
  CONSTRAINT FK_Cita_Psicologo FOREIGN KEY (id_psicologo)
    REFERENCES Psicologo (id_psicologo) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Sesion ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Sesion (
  id_sesion       INT      NOT NULL AUTO_INCREMENT,
  id_cita         INT      NOT NULL,
  numero_sesion   INT      NOT NULL,
  notas           TEXT     NULL,
  recomendaciones TEXT     NULL,
  fecha_registro  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_sesion),
  UNIQUE KEY UQ_Sesion_cita (id_cita),
  CONSTRAINT FK_Sesion_Cita FOREIGN KEY (id_cita)
    REFERENCES Cita (id_cita) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Historial_Clinico ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Historial_Clinico (
  id_historial   INT      NOT NULL AUTO_INCREMENT,
  id_estudiante  INT      NOT NULL,
  id_psicologo   INT      NOT NULL,
  fecha_apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_historial),
  UNIQUE KEY UQ_Historial (id_estudiante, id_psicologo),
  CONSTRAINT FK_Historial_Estudiante FOREIGN KEY (id_estudiante)
    REFERENCES Estudiante (id_estudiante) ON DELETE CASCADE,
  CONSTRAINT FK_Historial_Psicologo FOREIGN KEY (id_psicologo)
    REFERENCES Psicologo (id_psicologo) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Detalle_Historial ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Detalle_Historial (
  id_detalle     INT      NOT NULL AUTO_INCREMENT,
  id_historial   INT      NOT NULL,
  id_sesion      INT      NOT NULL,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_detalle),
  UNIQUE KEY UQ_Detalle_Sesion (id_sesion),
  CONSTRAINT FK_Detalle_Historial FOREIGN KEY (id_historial)
    REFERENCES Historial_Clinico (id_historial) ON DELETE CASCADE,
  CONSTRAINT FK_Detalle_Sesion FOREIGN KEY (id_sesion)
    REFERENCES Sesion (id_sesion) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Backup_Log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Backup_Log (
  id_backup      INT          NOT NULL AUTO_INCREMENT,
  tipo           VARCHAR(20)  NOT NULL COMMENT 'COMPLETO|DIFERENCIAL|INCREMENTAL',
  formato        VARCHAR(10)  NOT NULL COMMENT 'SQL|JSON|EXCEL|CSV',
  nombre_archivo VARCHAR(255) NOT NULL,
  tamanio_kb     INT          NULL,
  modo           VARCHAR(15)  NOT NULL COMMENT 'MANUAL|AUTOMATICO',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_backup)
) ENGINE=InnoDB;

-- ── Backup_Config ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Backup_Config (
  id               INT         NOT NULL AUTO_INCREMENT,
  tipo             VARCHAR(20) NOT NULL COMMENT 'COMPLETO|DIFERENCIAL|INCREMENTAL',
  formato          VARCHAR(10) NOT NULL COMMENT 'SQL|JSON|EXCEL|CSV',
  frecuencia_horas INT         NOT NULL DEFAULT 24,
  activo           TINYINT(1)  NOT NULL DEFAULT 1,
  ultima_ejecucion DATETIME    NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;
