import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    // Redirige a la invitación principal
    router.replace('/invitacion');
  }, [router]);
  return null;
}
