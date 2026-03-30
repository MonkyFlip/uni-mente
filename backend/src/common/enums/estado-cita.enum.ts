import { registerEnumType } from '@nestjs/graphql';
export enum EstadoCita {
  PENDIENTE = 'PENDIENTE',
  ASISTIDA  = 'ASISTIDA',
  CANCELADA = 'CANCELADA',
}
registerEnumType(EstadoCita, { name: 'EstadoCita' });
