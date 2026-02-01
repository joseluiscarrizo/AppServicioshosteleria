import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import ChatBubble from './ChatBubble';

export default function ChatWindow({ grupo, user }) {
  const [mensaje, setMensaje] = useState('');
  const [mensajesLocales, setMensajesLocales] = useState([]);
  const [mostrarMiembros, setMostrarMiembros] = useState(false);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: mensajes = [], isLoading } = useQuery({
    queryKey: ['mensajes-chat', grupo?.id],
    queryFn: () => base44.entities.MensajeChat.filter({ grupo_id: grupo.id }, 'created_date'),
    enabled: !!grupo?.id,
    refetchInterval: 3000
  });

  useEffect(() => {
    setMensajesLocales(mensajes);
  }, [mensajes]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!grupo?.id) return;

    const unsubscribe = base44.entities.MensajeChat.subscribe((event) => {
      if (event.type === 'create' && event.data.grupo_id === grupo.id) {
        setMensajesLocales(prev => [...prev, event.data]);
        
        // Notificar si no es mensaje propio
        if (event.data.user_id !== user?.id) {
          toast.info(`${event.data.nombre_usuario}: ${event.data.mensaje.substring(0, 50)}...`);
          
          // Reproducir sonido
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTWN2e/IdCQEKXbF8NaLOwsVXLDq7a1OFQpJnuLswm4fBDGK2PCxcCoFKm/A7dSTQQsUW7bq66hVFApGn+DyvmwhBTWN2e/IdCQEKXbF8NaLOwsVXLDq7a1OFQpJnuLswm4fBDGK2PCxcCo=');
            audio.volume = 0.2;
            audio.play().catch(() => {});
          } catch (e) {}
        }
        
        scrollToBottom();
      }
    });

    return unsubscribe;
  }, [grupo?.id, user?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensajesLocales]);

  const enviarMutation = useMutation({
    mutationFn: async (nuevoMensaje) => {
      await base44.entities.MensajeChat.create(nuevoMensaje);
    },
    onSuccess: () => {
      setMensaje('');
      queryClient.invalidateQueries({ queryKey: ['mensajes-chat'] });
    },
    onError: () => {
      toast.error('Error al enviar mensaje');
    }
  });

  const handleEnviar = () => {
    if (!mensaje.trim()) return;

    const nuevoMensaje = {
      grupo_id: grupo.id,
      user_id: user.id,
      nombre_usuario: user.full_name,
      rol_usuario: user.role === 'coordinador' ? 'coordinador' : 'camarero',
      mensaje: mensaje.trim(),
      tipo: 'texto',
      leido_por: [user.id]
    };

    enviarMutation.mutate(nuevoMensaje);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  if (!grupo) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400 p-8">
          <Users className="w-12 h-12 mx-auto mb-3" />
          <p>Selecciona un grupo para empezar a chatear</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{grupo.nombre}</CardTitle>
              {grupo.descripcion && (
                <p className="text-sm text-slate-500 mt-1">{grupo.descripcion}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarMiembros(true)}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              {grupo.miembros?.length || 0} miembros
            </Button>
          </div>
        </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : mensajesLocales.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              <p>No hay mensajes aún</p>
              <p className="text-sm mt-1">Sé el primero en enviar un mensaje</p>
            </div>
          ) : (
            mensajesLocales.map(msg => (
              <ChatBubble key={msg.id} mensaje={msg} user={user} />
            ))
          )}
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              rows={2}
              className="resize-none"
            />
            <Button
              onClick={handleEnviar}
              disabled={!mensaje.trim() || enviarMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
            >
              {enviarMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Enter para enviar, Shift+Enter para nueva línea
          </p>
        </div>
      </CardContent>
    </Card>

    <Dialog open={mostrarMiembros} onOpenChange={setMostrarMiembros}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Miembros del Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {grupo.miembros?.map((miembro, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] flex items-center justify-center text-white font-semibold">
                {miembro.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{miembro.nombre}</p>
                <p className="text-xs text-slate-500 capitalize">{miembro.rol}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}