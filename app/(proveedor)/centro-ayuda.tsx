import React from 'react';
import { CentroAyudaScreen, type Faq } from '@/screens/CentroAyudaScreen';
import { useTranslation } from '@/i18n';

export default function CentroAyudaProveedorScreen() {
  const { t } = useTranslation();
  const faqs: Faq[] = [
    { pregunta: t('ayuda.proveedor.q1'), respuesta: t('ayuda.proveedor.a1') },
    { pregunta: t('ayuda.proveedor.q2'), respuesta: t('ayuda.proveedor.a2') },
    { pregunta: t('ayuda.proveedor.q3'), respuesta: t('ayuda.proveedor.a3') },
    { pregunta: t('ayuda.proveedor.q4'), respuesta: t('ayuda.proveedor.a4') },
    { pregunta: t('ayuda.proveedor.q5'), respuesta: t('ayuda.proveedor.a5') },
    { pregunta: t('ayuda.proveedor.q6'), respuesta: t('ayuda.proveedor.a6') },
  ];
  return <CentroAyudaScreen faqs={faqs} subtitle={t('ayuda.proveedorSubtitulo')} />;
}
