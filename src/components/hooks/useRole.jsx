import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useRole() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  return {
    user,
    isAdmin: user?.role === 'admin',
    isCoordinator: user?.role === 'coordinador' || user?.role === 'admin',
    isCamarero: user?.role === 'camarero',
    role: user?.role,
  };
}