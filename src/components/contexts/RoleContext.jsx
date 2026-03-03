import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null))
      .finally(() => setLoading(false));
  }, []);

  const role = currentUser?.role;
  const isAdmin = role === 'admin';
  const isAdminLevel1 = role === 'admin';
  const isAdminLevel2 = role === 'admin' || role === 'admin_level2';
  const isCoordinator = role === 'coordinador' || role === 'admin';
  const isCamarero = role === 'camarero';

  const hasPermission = (action, resource, scope) => {
    if (isAdmin) return true;
    if (isCoordinator) return true;
    return false;
  };

  return (
    <RoleContext.Provider value={{
      currentUser,
      loading,
      role,
      isAdmin,
      isAdminLevel1,
      isAdminLevel2,
      isCoordinator,
      isCamarero,
      hasPermission,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    // Fallback if used outside provider
    return {
      currentUser: null,
      loading: false,
      role: null,
      isAdmin: false,
      isAdminLevel1: false,
      isAdminLevel2: false,
      isCoordinator: false,
      isCamarero: false,
      hasPermission: () => false,
    };
  }
  return ctx;
}