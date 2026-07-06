import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { COMISION_PLATAFORMA } from '@/types/models';
import type { PerfilProfesionalSignup, Usuario } from '@/types/models';

/**
 * Configuración remota de la plataforma (doc Firestore: config/plataforma).
 * Editable desde el panel admin (beautyapp-admin → Configuración).
 */
export const configService = {
  /** Comisión global de la plataforma como fracción (0-1). */
  async comisionGlobal(): Promise<number> {
    try {
      const snap = await getDoc(doc(db, 'config', 'plataforma'));
      const pct = snap.data()?.comisionPorcentaje;
      if (typeof pct === 'number' && pct >= 0 && pct <= 100) return pct / 100;
    } catch {
      // sin conexión o sin permiso → fallback
    }
    return COMISION_PLATAFORMA;
  },

  /**
   * Comisión efectiva para un profesional como fracción (0-1):
   * 1. Si tiene exención vigente (premio de competencia) → 0.
   * 2. Si tiene porcentaje personalizado → ese valor.
   * 3. Si no → la comisión global.
   */
  async comisionPara(profesionalId: string): Promise<number> {
    try {
      const snap = await getDoc(doc(db, 'usuarios', profesionalId));
      const perfil = (snap.data() as Usuario | undefined)?.perfil as
        | PerfilProfesionalSignup
        | undefined;

      const hoy = new Date().toISOString().slice(0, 10);
      if (perfil?.comisionExentaHasta && perfil.comisionExentaHasta >= hoy) {
        return 0;
      }
      const pct = perfil?.comisionPorcentaje;
      if (typeof pct === 'number' && pct >= 0 && pct <= 100) return pct / 100;
    } catch {
      // fallback a la global
    }
    return this.comisionGlobal();
  },
};
