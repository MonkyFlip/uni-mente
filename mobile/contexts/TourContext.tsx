/**
 * TourContext.tsx — sin emojis, usa keys de icono que Tour.tsx mapea a Lucide
 */
import {
  createContext, useContext, useState,
  useEffect, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Rol } from './AuthContext';

export interface TourStep {
  title:       string;
  description: string;
}

const TOUR_STEPS: Record<Rol, TourStep[]> = {
  administrador: [
    { title: 'Inicio',          description: 'Estadísticas generales del sistema en tiempo real.' },
    { title: 'Psicólogos',      description: 'Registra, edita y activa/desactiva psicólogos. Los filtros muestran activos e inactivos.' },
    { title: 'Estudiantes',     description: 'Gestiona las cuentas de estudiantes y controla su acceso al sistema.' },
    { title: 'Respaldos',       description: 'Crea backups en diferentes formatos. Requiere código MFA si está activo.' },
    { title: 'Configuración',   description: 'Programa backups automáticos con la frecuencia que necesites.' },
    { title: 'Seguridad',       description: 'Activa autenticación de dos factores para proteger las operaciones críticas.' },
    { title: 'Paleta de Color', description: 'Personaliza el color de la app desde el menú lateral.' },
  ],
  psicologo: [
    { title: 'Inicio',          description: 'Tus estadísticas: citas pendientes, historial y pacientes atendidos.' },
    { title: 'Agenda',          description: 'Tus próximas citas. Márcalas como asistidas o cancélalas.' },
    { title: 'Horarios',        description: 'Define tus días y horas de atención.' },
    { title: 'Pacientes',       description: 'Expediente completo de cada paciente y registro de sesiones clínicas.' },
    { title: 'PDF',             description: 'Genera y comparte el historial clínico de un paciente en PDF.' },
    { title: 'Seguridad',       description: 'Activa MFA para proteger tu cuenta con verificación en dos pasos.' },
    { title: 'Paleta de Color', description: 'Personaliza el color de la app desde el menú lateral.' },
  ],
  estudiante: [
    { title: 'Inicio',          description: 'Resumen de tus citas y estado de tu cuenta.' },
    { title: 'Buscar',          description: 'Explora los psicólogos disponibles y sus horarios de atención.' },
    { title: 'Agendar',         description: 'Selecciona un psicólogo, elige un día disponible y confirma tu cita.' },
    { title: 'Calendario',      description: 'Solo muestra los días que coinciden con el horario del psicólogo elegido.' },
    { title: 'Mis Citas',       description: 'Consulta todas tus citas. Puedes cancelar las pendientes.' },
    { title: 'Filtros',         description: 'Filtra por estado: Todas, Pendientes, Asistidas o Canceladas.' },
    { title: 'Paleta de Color', description: 'Personaliza el color de la app desde el menú lateral.' },
  ],
};

interface TourContextType {
  visible:    boolean;
  step:       number;
  steps:      TourStep[];
  totalSteps: number;
  next:       () => void;
  prev:       () => void;
  finish:     () => void;
  startTour:  () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children, rol }: { children: ReactNode; rol: Rol | null }) {
  const [visible, setVisible] = useState(false);
  const [step,    setStep]    = useState(0);

  const steps = rol ? TOUR_STEPS[rol] : [];

  useEffect(() => {
    if (!rol) return;
    AsyncStorage.getItem(`tour_done_${rol}`).then(done => {
      if (!done) { setStep(0); setVisible(true); }
    });
  }, [rol]);

  const next = () => step < steps.length - 1 ? setStep(s => s + 1) : finish();
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const finish = async () => {
    if (rol) await AsyncStorage.setItem(`tour_done_${rol}`, '1');
    setVisible(false);
    setStep(0);
  };

  const startTour = () => { setStep(0); setVisible(true); };

  return (
    <TourContext.Provider value={{ visible, step, steps, totalSteps: steps.length, next, prev, finish, startTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be inside TourProvider');
  return ctx;
}