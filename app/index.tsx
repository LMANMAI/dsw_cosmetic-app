import { Redirect } from 'expo-router';
import { useSession } from '@/context/SessionContext';

export default function Index() {
  const { user, loading, emailValidado } = useSession();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  // Sin el mail validado no se entra a ninguna vista de la app.
  if (!emailValidado) return <Redirect href="/(auth)/verificar-email" />;
  switch (user.rol) {
    case 'profesional':
      return <Redirect href="/(profesional)/agenda" />;
    case 'proveedor':
      return <Redirect href="/(proveedor)/inicio" />;
    default:
      return <Redirect href="/(cliente)/buscar" />;
  }
}
