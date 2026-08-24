import React from 'react';
import { CentroAyudaScreen, type Faq } from '@/screens/CentroAyudaScreen';
import { useTranslation } from '@/i18n';

export default function CentroAyudaClienteScreen() {
  const { t } = useTranslation();
  const faqs: Faq[] = [
    { pregunta: t('ayuda.cliente.q1'), respuesta: t('ayuda.cliente.a1') },
    { pregunta: t('ayuda.cliente.q2'), respuesta: t('ayuda.cliente.a2') },
    { pregunta: t('ayuda.cliente.q3'), respuesta: t('ayuda.cliente.a3') },
    { pregunta: t('ayuda.cliente.q4'), respuesta: t('ayuda.cliente.a4') },
    { pregunta: t('ayuda.cliente.q5'), respuesta: t('ayuda.cliente.a5') },
    { pregunta: t('ayuda.cliente.q6'), respuesta: t('ayuda.cliente.a6') },
    { pregunta: t('ayuda.cliente.q7'), respuesta: t('ayuda.cliente.a7') },
  ];
  return <CentroAyudaScreen faqs={faqs} />;
}
