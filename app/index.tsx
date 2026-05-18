import { Redirect } from 'expo-router';
import { useSession } from '@/context/SessionContext';

export default function Index() {
  const { user, loading } = useSession();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  switch (user.rol) {
    case 'profesional':
      return <Redirect href="/(profesional)/agenda" />;
    case 'proveedor':
      return <Redirect href="/(proveedor)/inicio" />;
    default:
      return <Redirect href="/(cliente)/buscar" />;
  }
}
