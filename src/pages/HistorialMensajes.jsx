import React from 'react';
import HistorialWhatsApp from '../components/whatsapp/HistorialWhatsApp';

export default function HistorialMensajes() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Historial de Mensajes</h1>
          <p className="text-slate-500 mt-2">
            Registro completo de todos los mensajes de WhatsApp enviados
          </p>
        </div>

        <HistorialWhatsApp />
      </div>
    </div>
  );
}