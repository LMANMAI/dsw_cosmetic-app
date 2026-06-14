import React from 'react';
import { CentroAyudaScreen, type Faq } from '@/screens/CentroAyudaScreen';

const FAQS_CLIENTE: Faq[] = [
  {
    pregunta: '¿Cómo reservo un turno?',
    respuesta:
      'Desde la pestaña Buscar, elegí una profesional (en el mapa o la lista), entrá a su perfil, seleccioná el servicio y tocá un horario disponible. Listo: tu turno queda registrado y lo ves en Mis turnos.',
  },
  {
    pregunta: '¿Qué es la seña y cómo se paga?',
    respuesta:
      'Algunas profesionales piden una seña (un porcentaje del valor del servicio) para confirmar el turno. Por el momento las señas y pagos se procesan únicamente a través de MercadoPago.',
  },
  {
    pregunta: '¿Cómo cancelo o reprogramo un turno?',
    respuesta:
      'En Mis turnos, tocá el turno y elegí Cancelar. La opción de reprogramar sin cancelar está en desarrollo: por ahora cancelá y reservá un nuevo horario.',
  },
  {
    pregunta: '¿Cómo funcionan los recordatorios?',
    respuesta:
      'Te enviamos una notificación antes de cada turno confirmado. Podés elegir la anticipación (30 min, 1h, 2h o 24h) o desactivarlos desde Perfil → Recordatorio de turnos.',
  },
  {
    pregunta: '¿Para qué sirven las direcciones guardadas?',
    respuesta:
      'Si el servicio es a domicilio, la profesional necesita saber dónde atenderte. Podés guardar varias direcciones (casa, trabajo, etc.) desde Perfil → Direcciones guardadas.',
  },
  {
    pregunta: '¿Cómo valoro a una profesional?',
    respuesta:
      'Cuando un turno queda marcado como completado, en Mis turnos vas a poder dejarle una puntuación de 1 a 5 estrellas y un comentario opcional.',
  },
  {
    pregunta: '¿Cómo cambio mis datos personales?',
    respuesta:
      'Desde Perfil → Datos personales podés editar tu nombre, teléfono, foto, ciudad y fecha de nacimiento. El email de la cuenta no se puede cambiar desde la app.',
  },
];

export default function CentroAyudaClienteScreen() {
  return <CentroAyudaScreen faqs={FAQS_CLIENTE} />;
}
