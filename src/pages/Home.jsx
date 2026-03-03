import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Layout from '@/Layout';

export default function Home() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // Verificar autenticación
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          // Si no está autenticado, ir al login
          await base44.auth.redirectToLogin();
          return;
        }
        
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setLoading(false);
      } catch (err) {
        console.error('Home error:', err);
        setError(err.message || 'Error desconocido');
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h2>Error: {error}</h2>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }

  return (
    <Layout currentPageName="Home">
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}</h1>
        <p>Dashboard de Coordinación de Camareros</p>
      </div>
    </Layout>
  );
}