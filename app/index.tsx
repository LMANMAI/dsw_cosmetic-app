import { Redirect } from 'expo-router';
import { useSession } from '@/context/SessionContext';

export default function Index() {
  const { user, loading } = useSession();
  if (loading) return null;
  if (!user) return <Redirect href="/login" />;
  return user.rol === 'profesional' ? (
    <Redirect href="/(profesional)/agenda" />
  ) : (
    <Redirect href="/(cliente)/buscar" />
  );
}
