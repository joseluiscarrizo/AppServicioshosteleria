import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, Users, Paperclip, Megaphone, X, FileIcon } from 'lucide-react';
import { toast } from 'sonner';
import ChatBubble from './ChatBubble';
import EventoContextBanner from './EventoContextBanner';

export default function ChatWindow({ grupo, user }) {
  const [mensaje, setMensaje] = useState('');
  const [mensajesLocales, setMensajesLocales] = useState([]);
  const [mostrarMiembros, setMostrarMiembros] = useState(false);
  const [destinatario, setDestinatario] = useState('todos'); // 'todos' | camarero_id
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: mensajes = [], isLoading } = useQuery({
    queryKey: ['mensajes-chat', grupo?.id],
    queryFn: () => base44.entities.MensajeChat.filter({ grupo_id: grupo.id }, 'created_date'),
    enabled: !!grupo?.id,
    staleTime: 30000,
    refetchInterval: 30000
  });

  useEffect(() => {
    setMensajesLocales(mensajes);
    // Mark messages as read
    if (user?.id && mensajes.length > 0) {
      const sinLeer = mensajes.filter(m =>
        m.user_id !== user.id && !m.leido_por?.includes(user.id)
      );
      sinLeer.forEach(m => {
        base44.entities.MensajeChat.update(m.id, {
          leido_por: [...(m.leido_por || []), user.id],
          leido_por_nombres: [...(m.leido_por_nombres || []), user.full_name]
        }).catch(() => {});
      });
    }
  }, [mensajes, user?.id]);

  // Reset destinatario when group changes
  useEffect(() => {
    setDestinatario('todos');
    setArchivoSeleccionado(null);
    setMensaje('');
  }, [grupo?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!grupo?.id) return;
    const unsubscribe = base44.entities.MensajeChat.subscribe((event) => {
      if (event.type === 'create' && event.data.grupo_id === grupo.id) {
        setMensajesLocales(prev => {
          if (prev.find(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
        if (event.data.user_id !== user?.id) {
          toast.info(`${event.data.nombre_usuario}: ${event.data.mensaje.substring(0, 50)}`);
        }
      }
      if (event.type === 'update') {
        setMensajesLocales(prev =>
          prev.map(m => m.id === event.id ? { ...m, ...event.data } : m)
        );
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

  useEffect(() => { scrollToBottom(); }, [mensajesLocales.length]);

  const enviarMutation = useMutation({
    mutationFn: async (nuevoMensaje) => {
      await base44.entities.MensajeChat.create(nuevoMensaje);
    },
    onSuccess: () => {
      setMensaje('');
      setArchivoSeleccionado(null);
      queryClient.invalidateQueries({ queryKey: ['mensajes-chat'] });
    },
    onError: () => toast.error('Error al enviar mensaje')
  });

  const handleSeleccionarArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar 10MB');
      return;
    }
    setArchivoSeleccionado(file);
  };

  const handleEnviar = async () => {
    if (!mensaje.trim() && !archivoSeleccionado) return;

    let archivoUrl = null;
    let archivoNombre = null;
    let archivoTipo = null;

    if (archivoSeleccionado) {
      setSubiendoArchivo(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: archivoSeleccionado });
        archivoUrl = file_url;
        archivoNombre = archivoSeleccionado.name;
        archivoTipo = archivoSeleccionado.type;
      } catch {
        toast.error('Error al subir el archivo');
        setSubiendoArchivo(false);
        return;
      }
      setSubiendoArchivo(false);
    }

    const destinatarioObj = destinatario !== 'todos'
      ? grupo.miembros?.find(m => m.user_id === destinatario)
      : null;

    const nuevoMensaje = {
      grupo_id: grupo.id,
      user_id: user.id,
      nombre_usuario: user.full_name,
      rol_usuario: user.role === 'coordinador' ? 'coordinador' : user.role === 'admin' ? 'admin' : 'camarero',
      mensaje: mensaje.trim() || (archivoNombre ? `📎 ${archivoNombre}` : ''),
      tipo: archivoUrl ? 'archivo' : (destinatario === 'todos' ? 'masivo' : 'texto'),
      destinatario_id: destinatarioObj?.user_id || null,
      destinatario_nombre: destinatarioObj?.nombre || null,
      archivo_url: archivoUrl,
      archivo_nombre: archivoNombre,
      archivo_tipo: archivoTipo,
      leido_por: [user.id],
      leido_por_nombres: [user.full_name]
    };

    enviarMutation.mutate(nuevoMensaje);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  // Filter messages: show all if recipient is 'todos' or if it's the current user's message or directed to current user
  const mensajesFiltrados = mensajesLocales.filter(m => {
    if (!m.destinatario_id) return true; // mensaje a todos
    if (m.user_id === user?.id) return true; // mensaje propio
    if (m.destinatario_id === user?.id) return true; // dirigido a mí
    if (user?.role === 'coordinador' || user?.role === 'admin') return true; // coordinador ve todo
    return false;
  });

  const camarerosMiembros = grupo?.miembros?.filter(m => m.rol === 'camarero') || [];

  if (!grupo) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400 p-8">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Selecciona un grupo para chatear</p>
          <p className="text-sm mt-1 text-slate-300">Los grupos se crean al confirmar un evento</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <CardHeader className="border-b pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{grupo.nombre}</CardTitle>
              {grupo.descripcion && (
                <p className="text-sm text-slate-500 mt-0.5 truncate">{grupo.descripcion}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarMiembros(true)}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <Users className="w-4 h-4" />
              {grupo.miembros?.length || 0}
            </Button>
          </div>
        </CardHeader>

        {/* Event context banner */}
        <EventoContextBanner grupo={grupo} />

        {/* Messages */}
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <div
            className="flex-1 overflow-y-auto p-4"
            ref={scrollRef}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : mensajesFiltrados.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                <p>No hay mensajes aún</p>
                <p className="text-sm mt-1">Sé el primero en enviar un mensaje</p>
              </div>
            ) : (
              mensajesFiltrados.map(msg => (
                <ChatBubble key={msg.id} mensaje={msg} user={user} miembros={grupo.miembros || []} />
              ))
            )}
          </div>

          {/* Input area */}
          <div className="border-t p-3 space-y-2 bg-white">
            {/* Recipient selector (coordinators only) */}
            {(user?.role === 'coordinador' || user?.role === 'admin') && camarerosMiembros.length > 0 && (
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <Select value={destinatario} onValueChange={setDestinatario}>
                  <SelectTrigger className="h-8 text-xs border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">
                      <span className="flex items-center gap-2">
                        <Megaphone className="w-3 h-3" /> Mensaje a todos
                      </span>
                    </SelectItem>
                    {camarerosMiembros.map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.nombre} (individual)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {destinatario !== 'todos' && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs whitespace-nowrap">
                    → {camarerosMiembros.find(m => m.user_id === destinatario)?.nombre}
                  </Badge>
                )}
              </div>
            )}

            {/* File preview */}
            {archivoSeleccionado && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 text-sm">
                <FileIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="flex-1 truncate text-blue-700">{archivoSeleccionado.name}</span>
                <span className="text-xs text-blue-400">
                  {(archivoSeleccionado.size / 1024).toFixed(0)} KB
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 text-blue-400"
                  onClick={() => { setArchivoSeleccionado(null); fileInputRef.current.value = ''; }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleSeleccionarArchivo}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-400 hover:text-slate-600 flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar archivo"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <Textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={archivoSeleccionado ? "Añade un comentario (opcional)..." : "Escribe un mensaje..."}
                rows={1}
                className="resize-none min-h-[36px] max-h-[120px] py-2 text-sm"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />

              <Button
                onClick={handleEnviar}
                disabled={(!mensaje.trim() && !archivoSeleccionado) || enviarMutation.isPending || subiendoArchivo}
                className="bg-[#1e3a5f] hover:bg-[#152a45] h-9 px-3 flex-shrink-0"
              >
                {(enviarMutation.isPending || subiendoArchivo) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-400">Enter para enviar · Shift+Enter para nueva línea</p>
          </div>
        </CardContent>
      </Card>

      {/* Members dialog */}
      <Dialog open={mostrarMiembros} onOpenChange={setMostrarMiembros}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Miembros del grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {grupo.miembros?.map((miembro, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                  miembro.rol === 'coordinador' ? 'bg-[#1e3a5f]' : 'bg-emerald-600'
                }`}>
                  {miembro.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{miembro.nombre}</p>
                  <p className="text-xs text-slate-500 capitalize">{miembro.rol}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{miembro.rol}</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}