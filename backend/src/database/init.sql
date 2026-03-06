-- ================================================================
--  UniMente — Inicialización de base de datos (idempotente)
--  Crea la BD y las tablas si no existen.
--  El usuario admin lo crea el seed con bcrypt correcto.
-- ================================================================

CREATE DATABASE IF NOT EXISTS unimente
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE unimente;

CREATE TABLE IF NOT EXISTS Rol (
  id_rol INT         NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  PRIMARY KEY (id_rol),
  UNIQUE KEY UQ_Rol_nombre (nombre)
) ENGINE=InnoDB;

INSERT IGNORE INTO Rol (nombre) VALUES ('administrador'), ('psicologo'), ('estudiante');

CREATE TABLE IF NOT EXISTS Usuario (
  id_usuario    INT          NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  correo        VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  id_rol        INT          NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY UQ_Usuario_correo (correo),
  CONSTRAINT FK_Usuario_Rol FOREIGN KEY (id_rol) REFERENCES Rol (id_rol)
) ENGINE=InnoDB;

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