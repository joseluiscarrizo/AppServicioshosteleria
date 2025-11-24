import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, CheckCheck, AlertTriangle, Clock, RefreshCw, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationService from './NotificationService';

const prioridadColors = {
  baja: 'bg-slate-100 text-slate-600 border-slate-200',
  media: 'bg-blue-100 text-blue-700 border-blue-200',
  alta: 'bg-amber-100 text-amber-700 border-amber-200',
  urgente: 'bg-red-100 text-red-700 border-red-200'
};

const tipoIcons = {
  estado_cambio: RefreshCw,
  evento_proximo: Clock,
  recordatorio: Bell,
  alerta: AlertTriangle
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notificaciones = [], isLoading } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => base44.entities.Notificacion.list('-created_date', 50),
    refetchInterval: 30000 // Refrescar cada 30 segundos
  });

  const noLeidas = notificaciones.filter(n => !n.leida);

  const marcarLeidaMutation = useMutation({
    mutationFn: (id) => NotificationService.marcarComoLeida(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
  });

  const marcarTodasMutation = useMutation({
    mutationFn: () => {
      return Promise.all(noLeidas.map(n => NotificationService.marcarComoLeida(n.id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
  });

  // Verificar eventos próximos al cargar
  useEffect(() => {
    NotificationService.verificarEventosProximos().then(() => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    });
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-slate-600 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {noLeidas.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium"
              >
                {noLeidas.length > 9 ? '9+' : noLeidas.length}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Notificaciones</h3>
          {noLeidas.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => marcarTodasMutation.mutate()}
              className="text-xs text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3a5f]"></div>
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notificaciones.map((notif) => {
                const Icon = tipoIcons[notif.tipo] || Bell;
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.leida ? 'bg-blue-50/50' : ''}`}
                    onClick={() => !notif.leida && marcarLeidaMutation.mutate(notif.id)}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg ${prioridadColors[notif.prioridad]} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!notif.leida ? 'text-slate-900' : 'text-slate-600'}`}>
                            {notif.titulo}
                          </p>
                          {!notif.leida && (
                            <span className="w-2 h-2 rounded-full bg-[#1e3a5f] shrink-0 mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {notif.mensaje}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(notif.created_date), { 
                              addSuffix: true, 
                              locale: es 
                            })}
                          </span>
                          {notif.email_enviado && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5">
                              <Mail className="w-3 h-3 mr-1" />
                              Email
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}