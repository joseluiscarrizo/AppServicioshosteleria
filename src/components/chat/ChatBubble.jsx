import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatBubble({ mensaje, isOwnMessage, user }) {
  const esUsuarioActual = mensaje.user_id === user?.id;
  const esMensajeSistema = mensaje.tipo === 'sistema';

  if (esMensajeSistema) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">
          {mensaje.mensaje}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 mb-3", esUsuarioActual ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        esUsuarioActual ? "bg-[#1e3a5f]" : "bg-slate-300"
      )}>
        <User className="w-4 h-4 text-white" />
      </div>
      
      <div className={cn("max-w-[70%]", esUsuarioActual && "flex flex-col items-end")}>
        {!esUsuarioActual && (
          <p className="text-xs text-slate-500 mb-1 px-1">
            {mensaje.nombre_usuario}
            {mensaje.rol_usuario === 'coordinador' && (
              <span className="ml-1 text-[#1e3a5f] font-medium">• Coordinador</span>
            )}
          </p>
        )}
        
        <div className={cn(
          "rounded-2xl px-4 py-2",
          esUsuarioActual 
            ? "bg-[#1e3a5f] text-white rounded-tr-sm" 
            : "bg-white border border-slate-200 rounded-tl-sm"
        )}>
          <p className="text-sm whitespace-pre-wrap break-words">{mensaje.mensaje}</p>
        </div>
        
        <div className="flex items-center gap-1 mt-1 px-1">
          <span className="text-xs text-slate-400">
            {format(new Date(mensaje.created_date), 'HH:mm', { locale: es })}
          </span>
          {esUsuarioActual && mensaje.leido_por?.length > 0 && (
            <CheckCheck className="w-3 h-3 text-blue-500" />
          )}
        </div>
      </div>
    </div>
  );
}