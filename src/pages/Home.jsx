import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Layout from '@/Layout';

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        console.error('No user authenticated:', err);
      }
    })();
  }, []);

  return (
    <Layout currentPageName="Home">
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}</h1>
        <p>Dashboard de Coordinación de Camareros</p>
      </div>
    </Layout>
  );
}