export interface TourStep {
  target: string;           // data-tour="value" on the element
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: Record<string, TourStep[]> = {
  estudiante: [
    {
      target: 'sidebar-brand',
      title: 'Bienvenido a UniMente',
      description: 'Este es el portal de bienestar universitario. Desde aquí puedes acceder a atención psicológica confidencial y profesional.',
      position: 'right',
    },
    {
      target: 'nav-dashboard',
      title: 'Panel de inicio',
      description: 'Tu punto de partida. Aquí verás un resumen de tus citas pendientes, sesiones completadas y psicólogos disponibles.',
      position: 'right',
    },
    {
      target: 'nav-psicologos',
      title: 'Buscar psicólogos',
      description: 'Explora los profesionales disponibles. Puedes filtrar por nombre o especialidad y ver sus horarios de atención.',
      position: 'right',
    },
    {
      target: 'nav-mis-citas',
      title: 'Mis citas',
      description: 'Consulta todas tus citas programadas. Puedes ver el estado de cada una y cancelarlas si lo necesitas.',
      position: 'right',
    },
    {
      target: 'tour-stats',
      title: 'Tu resumen',
      description: 'Aquí verás en tiempo real cuántas citas tienes pendientes, sesiones completadas y psicólogos disponibles para ti.',
      position: 'bottom',
    },
    {
      target: 'tour-actions',
      title: 'Acciones rápidas',
      description: 'Atajos para las tareas más comunes: buscar un psicólogo y revisar tus citas sin navegar por el menú.',
      position: 'top',
    },
    {
      target: 'sidebar-theme',
      title: 'Personaliza tu experiencia',
      description: 'Cambia la paleta de colores del portal a tu gusto. Tienes varios temas disponibles.',
      position: 'right',
    },
  ],

  psicologo: [
    {
      target: 'sidebar-brand',
      title: 'Bienvenido a UniMente',
      description: 'Panel profesional de psicólogos. Desde aquí gestionas tu agenda, horarios y el historial clínico de tus pacientes.',
      position: 'right',
    },
    {
      target: 'nav-dashboard',
      title: 'Tu panel',
      description: 'Resumen de tu actividad: citas de hoy, pendientes y total de pacientes que has atendido.',
      position: 'right',
    },
    {
      target: 'nav-agenda',
      title: 'Tu agenda',
      description: 'Visualiza todas tus citas. Puedes cambiar el estado de cada una, registrar sesiones clínicas y consultar los datos del estudiante.',
      position: 'right',
    },
    {
      target: 'nav-horarios',
      title: 'Gestión de horarios',
      description: 'Define los días y horas en que estás disponible para atender. Los estudiantes solo podrán agendar en los horarios que registres aquí.',
      position: 'right',
    },
    {
      target: 'tour-stats',
      title: 'Estadísticas del día',
      description: 'Monitorea tus citas en tiempo real: cuántas son hoy, cuántas están pendientes y el total de pacientes en tu historial.',
      position: 'bottom',
    },
    {
      target: 'tour-actions',
      title: 'Acceso rápido',
      description: 'Entra directamente a tu agenda o gestiona tus horarios con un clic desde el inicio.',
      position: 'top',
    },
    {
      target: 'sidebar-theme',
      title: 'Personaliza el tema',
      description: 'Elige la paleta de colores que más te guste para trabajar.',
      position: 'right',
    },
  ],

  administrador: [
    {
      target: 'sidebar-brand',
      title: 'Panel Administrativo',
      description: 'Bienvenido al panel de administración de UniMente. Desde aquí controlas el sistema completo: psicólogos, respaldos y seguridad.',
      position: 'right',
    },
    {
      target: 'nav-dashboard',
      title: 'Panel de control',
      description: 'Vista general del sistema: psicólogos activos, estudiantes registrados y total de citas gestionadas.',
      position: 'right',
    },
    {
      target: 'nav-psicologos',
      title: 'Gestión de psicólogos',
      description: 'Registra nuevos profesionales, edita su información y gestiona el equipo de atención.',
      position: 'right',
    },
    {
      target: 'tour-stats',
      title: 'Métricas del sistema',
      description: 'Monitorea en tiempo real cuántos psicólogos, estudiantes y citas tiene el sistema.',
      position: 'bottom',
    },
    {
      target: 'nav-backup',
      title: 'Sistema de respaldos',
      description: 'Crea respaldos completos, diferenciales o incrementales en formatos SQL, JSON, Excel o CSV. Configura respaldos automáticos y restaura desde cualquier punto guardado.',
      position: 'right',
    },
    {
      target: 'nav-mfa',
      title: 'Seguridad — MFA',
      description: 'Configura la autenticación de dos factores (TOTP). Al activarlo, crearBackup y restaurarBackup requerirán un código de tu app autenticadora, protegiendo el sistema de accesos no autorizados.',
      position: 'right',
    },
    {
      target: 'sidebar-theme',
      title: 'Personaliza tu panel',
      description: 'Cambia la paleta de colores del sistema a tu preferencia.',
      position: 'right',
    },
  ],
};
