import { gql } from '@apollo/client';

export const LOGIN = gql`
  mutation Login($correo: String!, $password: String!) {
    login(input: { correo: $correo, password: $password }) {
      access_token
      rol
      nombre
    }
  }
`;

export const REGISTRAR_ESTUDIANTE = gql`
  mutation RegistrarEstudiante($input: CreateEstudianteInput!) {
    registrarEstudiante(input: $input) {
      id_estudiante
      usuario { nombre correo }
      carrera
      matricula
    }
  }
`;

export const GET_ESTUDIANTES = gql`
  query GetEstudiantes {
    estudiantes {
      id_estudiante
      matricula
      carrera
      usuario { nombre correo }
    }
  }
`;

export const GET_PSICOLOGOS = gql`
  query GetPsicologos {
    psicologos {
      id_psicologo
      especialidad
      cedula
      telefono
      usuario { nombre correo }
      horarios { id_horario dia_semana hora_inicio hora_fin disponible }
    }
  }
`;

export const REGISTRAR_PSICOLOGO = gql`
  mutation RegistrarPsicologo($input: CreatePsicologoInput!) {
    registrarPsicologo(input: $input) {
      id_psicologo
      usuario { nombre correo }
      especialidad
    }
  }
`;

export const ACTUALIZAR_PSICOLOGO = gql`
  mutation ActualizarPsicologo($id: Int!, $input: UpdatePsicologoInput!) {
    actualizarPsicologo(id: $id, input: $input) {
      id_psicologo
      especialidad
      cedula
      telefono
    }
  }
`;

export const CREAR_HORARIO = gql`
  mutation CrearHorario($input: CreateHorarioInput!) {
    crearHorario(input: $input) {
      id_horario
      dia_semana
      hora_inicio
      hora_fin
      disponible
    }
  }
`;

export const ELIMINAR_HORARIO = gql`
  mutation EliminarHorario($id: Int!) {
    eliminarHorario(id: $id)
  }
`;

export const AGENDAR_CITA = gql`
  mutation AgendarCita($input: CreateCitaInput!) {
    agendarCita(input: $input) {
      id_cita
      fecha
      hora_inicio
      hora_fin
      estado
      motivo
      psicologo { usuario { nombre } especialidad }
    }
  }
`;

export const GET_CITAS_ESTUDIANTE = gql`
  query CitasEstudiante($id_estudiante: Int!) {
    citasEstudiante(id_estudiante: $id_estudiante) {
      id_cita
      fecha
      hora_inicio
      hora_fin
      estado
      motivo
      psicologo { id_psicologo especialidad usuario { nombre } }
    }
  }
`;

export const GET_AGENDA_PSICOLOGO = gql`
  query AgendaPsicologo($id_psicologo: Int!) {
    agendaPsicologo(id_psicologo: $id_psicologo) {
      id_cita
      fecha
      hora_inicio
      hora_fin
      estado
      motivo
      estudiante { id_estudiante matricula carrera usuario { nombre correo } }
    }
  }
`;

export const CAMBIAR_ESTADO_CITA = gql`
  mutation CambiarEstadoCita($id_cita: Int!, $input: UpdateEstadoCitaInput!) {
    cambiarEstadoCita(id_cita: $id_cita, input: $input) {
      id_cita
      estado
    }
  }
`;

export const REGISTRAR_SESION = gql`
  mutation RegistrarSesion($input: CreateSesionInput!) {
    registrarSesion(input: $input) {
      id_sesion
      numero_sesion
      notas
      recomendaciones
      fecha_registro
    }
  }
`;

export const GET_EXPEDIENTE = gql`
  query ExpedienteEstudiante($id_estudiante: Int!) {
    expedienteEstudiante(id_estudiante: $id_estudiante) {
      id_historial
      fecha_apertura
      psicologo { usuario { nombre } especialidad }
      detalles {
        id_detalle
        fecha_registro
        sesion {
          id_sesion
          numero_sesion
          notas
          recomendaciones
          fecha_registro
        }
      }
    }
  }
`;
