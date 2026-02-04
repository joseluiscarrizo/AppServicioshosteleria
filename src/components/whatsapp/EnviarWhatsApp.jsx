import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import EnvioMasivoWhatsApp from './EnvioMasivoWhatsApp';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle, Loader2, Send, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import GestionPlantillas from './GestionPlantillas';

export default function EnviarWhatsApp({ pedido, asignaciones, camareros, buttonVariant, buttonSize, buttonText }) {
  const [open, setOpen] = useState(false);
  const [selectedCamareros, setSelectedCamareros] = useState([]);
  const [coordinadorId, setCoordinadorId] = useState(null);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [archivoAdjunto, setArchivoAdjunto] = useState(null);
  const [archivoUrl, setArchivoUrl] = useState(null);
  const [mostrarEnvioMasivo, setMostrarEnvioMasivo] = useState(false);
  const queryClient = useQueryClient();

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list('nombre')
  });

  const { data: todosLosCamareros = [], isLoading: loadingCamareros } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre'),
    enabled: !camareros
  });

  const { data: plantillas = [] } = useQuery({
    queryKey: ['plantillas-whatsapp'],
    queryFn: () => base44.entities.PlantillaWhatsApp.filter({ activa: true }, 'nombre')
  });

  // Asegurar que siempre tengamos arrays válidos
  const listaCamareros = Array.isArray(camareros) ? camareros : (Array.isArray(todosLosCamareros) ? todosLosCamareros : []);
  const asignacionesArray = Array.isArray(asignaciones) ? asignaciones : [];

  const reemplazarCamposDinamicos = async (contenido, asignacion, camarero) => {
    const baseUrl = window.location.origin;
    const linkConfirmar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}`;
    const linkRechazar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}&action=rechazar`;

    // Calcular hora de encuentro si hay destino
    let horaEncuentro = 'Por confirmar';
    const puntoEncuentro = 'https://maps.app.goo.gl/zF44yK4fjTrVneoD9';
    
    if (pedido.link_ubicacion) {
      try {
        const resultadoDistancia = await base44.integrations.Core.InvokeLLM({
          prompt: `Calcula el tiempo de viaje en transporte desde ${puntoEncuentro} hasta ${pedido.link_ubicacion}. Devuelve solo el tiempo estimado en minutos como número.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              minutos: { type: "number" }
            }
          }
        });
        
        const minutosViaje = resultadoDistancia?.minutos || 30;
        const horaEntrada = asignacion.hora_entrada || pedido.entrada;
        
        if (horaEntrada) {
          const [horas, minutos] = horaEntrada.split(':').map(Number);
          const horaEntradaDate = new Date();
          horaEntradaDate.setHours(horas, minutos, 0);
          horaEntradaDate.setMinutes(horaEntradaDate.getMinutes() - minutosViaje - 10);
          
          horaEncuentro = `${horaEntradaDate.getHours().toString().padStart(2, '0')}:${horaEntradaDate.getMinutes().toString().padStart(2, '0')}`;
        }
      } catch (e) {
        console.error('Error calculando hora de encuentro:', e);
      }
    }

    let resultado = contenido
      .replace(/\{\{cliente\}\}/g, pedido.cliente || '')
      .replace(/\{\{dia\}\}/g, pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : 'Por confirmar')
      .replace(/\{\{lugar_evento\}\}/g, pedido.lugar_evento || 'Por confirmar')
      .replace(/\{\{hora_entrada\}\}/g, asignacion.hora_entrada || pedido.entrada || '-')
      .replace(/\{\{hora_salida\}\}/g, asignacion.hora_salida || pedido.salida || '-')
      .replace(/\{\{camisa\}\}/g, pedido.camisa || 'blanca')
      .replace(/\{\{hora_encuentro\}\}/g, horaEncuentro)
      .replace(/\{\{link_confirmar\}\}/g, linkConfirmar)
      .replace(/\{\{link_rechazar\}\}/g, linkRechazar)
      .replace(/\{\{link_ubicacion\}\}/g, pedido.link_ubicacion || '')
      .replace(/\{\{camarero_nombre\}\}/g, camarero?.nombre || '');

    return resultado;
  };

  const generarMensajeWhatsApp = async (asignacion, camarero) => {
    // Si hay una plantilla seleccionada, usarla
    if (plantillaSeleccionada) {
      const plantilla = plantillas.find(p => p.id === plantillaSeleccionada);
      if (plantilla) {
        return await reemplazarCamposDinamicos(plantilla.contenido, asignacion, camarero);
      }
    }

    // Si hay mensaje personalizado, usarlo
    if (mensajePersonalizado.trim()) {
      return await reemplazarCamposDinamicos(mensajePersonalizado, asignacion, camarero);
    }

    // Mensaje por defecto
    const baseUrl = window.location.origin;
    const linkConfirmar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}`;
    const linkRechazar = `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}&action=rechazar`;

    let mensaje = `📅 *Día:* ${pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : 'Por confirmar'}\n`;
    mensaje += `👤 *Cliente:* ${pedido.cliente}\n`;
    mensaje += `📍 *Lugar del Evento:* ${pedido.lugar_evento || 'Por confirmar'}\n`;
    mensaje += `🕐 *Hora de entrada:* ${asignacion.hora_entrada || pedido.entrada || '-'}\n\n`;

    if (pedido.extra_transporte) {
      // Con transporte - calcular hora de encuentro
      const puntoEncuentro = 'https://maps.app.goo.gl/hrR4eHSq4Q7dLcaV7';
      
      if (pedido.link_ubicacion) {
        try {
          const resultadoDistancia = await base44.integrations.Core.InvokeLLM({
            prompt: `Calcula el tiempo de viaje en transporte desde ${puntoEncuentro} hasta ${pedido.link_ubicacion}. Devuelve solo el tiempo estimado en minutos como número.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                minutos: { type: "number" }
              }
            }
          });
          
          const minutosViaje = resultadoDistancia?.minutos || 30;
          const horaEntrada = asignacion.hora_entrada || pedido.entrada;
          if (horaEntrada) {
            const [horas, minutos] = horaEntrada.split(':').map(Number);
            const horaEntradaDate = new Date();
            horaEntradaDate.setHours(horas, minutos, 0);
            horaEntradaDate.setMinutes(horaEntradaDate.getMinutes() - minutosViaje - 15);
            
            mensaje += `🚗 *Hora de encuentro:* ${horaEntradaDate.getHours().toString().padStart(2, '0')}:${horaEntradaDate.getMinutes().toString().padStart(2, '0')}\n`;
          }
        } catch (e) {
          console.error('Error calculando distancia:', e);
          mensaje += `🚗 *Hora de encuentro:* Por confirmar\n`;
        }
      }
      
      mensaje += `📌 *Punto de encuentro:* ${puntoEncuentro}\n\n`;
    } else {
      // Sin transporte - mostrar link de Google Maps
      if (pedido.link_ubicacion) {
        mensaje += `🗺️ *Ubicación:* ${pedido.link_ubicacion}\n\n`;
      }
    }

    mensaje += `👔 *Uniforme:* Zapatos, pantalón y delantal. Todo de color negro\n`;
    mensaje += `👕 *Camisa:* ${pedido.camisa || 'blanca'}\n`;
    mensaje += `✨ *Uniforme Impoluto.*\n\n`;
    mensaje += `⏰ *Presentarse 15 minutos antes para estar a la hora exacta en el puesto de trabajo.*\n\n`;
    mensaje += `━━━━━━━━━━━━━━━━\n`;
    mensaje += `Por favor, confirma tu asistencia:\n\n`;
    mensaje += `✅ *CONFIRMO*\n${linkConfirmar}\n\n`;
    mensaje += `❌ *RECHAZO*\n${linkRechazar}`;

    return mensaje;
  };

  const enviarMutation = useMutation({
    mutationFn: async () => {
      if (!coordinadorId) {
        throw new Error('Selecciona un coordinador');
      }

      const coordinador = coordinadores.find(c => c.id === coordinadorId);
      if (!coordinador?.telefono) {
        throw new Error('El coordinador seleccionado no tiene teléfono configurado');
      }

      // Subir archivo si hay
      let urlArchivo = archivoUrl;
      if (archivoAdjunto && !urlArchivo) {
        try {
          const resultado = await base44.integrations.Core.UploadFile({ file: archivoAdjunto });
          urlArchivo = resultado.file_url;
          setArchivoUrl(urlArchivo);
        } catch (error) {
          console.error('Error subiendo archivo:', error);
          toast.error('Error al subir archivo adjunto');
        }
      }

      const camarerosSeleccionados = listaCamareros.filter(c => 
        selectedCamareros.includes(c.id)
      );

      const asignacionesActualizadas = [];
      let enviadosDirectos = 0;
      let enviadosPorWeb = 0;

      for (const camarero of camarerosSeleccionados) {
        if (!camarero.telefono) {
          console.warn(`Camarero ${camarero.nombre} no tiene teléfono`);
          continue;
        }

        // Buscar la asignación del camarero
        const asignacion = asignacionesArray.find(a => a.camarero_id === camarero.id);
        if (!asignacion) {
          console.warn(`No se encontró asignación para ${camarero.nombre}`);
          continue;
        }

        let mensaje = await generarMensajeWhatsApp(asignacion, camarero);
        
        // Añadir link de archivo si existe
        if (urlArchivo) {
          mensaje += `\n\n📎 *Archivo adjunto:*\n${urlArchivo}`;
        }
        
        // Enviar mensaje directo por WhatsApp usando backend function
        try {
          const response = await base44.functions.invoke('enviarWhatsAppDirecto', {
            telefono: camarero.telefono,
            mensaje: mensaje,
            camarero_id: camarero.id,
            camarero_nombre: camarero.nombre,
            pedido_id: pedido.id,
            asignacion_id: asignacion.id,
            plantilla_usada: plantillaSeleccionada ? plantillas.find(p => p.id === plantillaSeleccionada)?.nombre : 'Manual'
          });
          const resultado = response.data || response;
          
          // Contar según método de envío
          if (resultado.enviado_por_api) {
            enviadosDirectos++;
            console.log(`✅ Mensaje enviado directamente a ${camarero.nombre}`);
          } else if (resultado.whatsapp_url) {
            enviadosPorWeb++;
            // Abrir WhatsApp Web como fallback
            window.open(resultado.whatsapp_url, '_blank');
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          console.error(`Error enviando WhatsApp a ${camarero.nombre}:`, error);
          throw new Error(`Error al enviar mensaje a ${camarero.nombre}`);
        }
        
        // Actualizar estado a "enviado" y crear notificación
        await base44.entities.AsignacionCamarero.update(asignacion.id, { estado: 'enviado' });
        
        await base44.entities.NotificacionCamarero.create({
          camarero_id: camarero.id,
          camarero_nombre: camarero.nombre,
          asignacion_id: asignacion.id,
          pedido_id: pedido.id,
          tipo: 'nueva_asignacion',
          titulo: `Nueva Asignación: ${pedido.cliente}`,
          mensaje: mensaje,
          cliente: pedido.cliente,
          lugar_evento: pedido.lugar_evento,
          fecha: pedido.dia,
          hora_entrada: asignacion.hora_entrada,
          hora_salida: asignacion.hora_salida,
          leida: false,
          respondida: false,
          respuesta: 'pendiente'
        });

        // Enviar notificación push usando el servicio
        try {
          const { NotificationService } = await import('../notificaciones/NotificationService');
          await NotificationService.notificarNuevaAsignacion(camarero, pedido, asignacion);
        } catch (e) {
          console.error('Error enviando push:', e);
        }

        asignacionesActualizadas.push(asignacion.id);
        
        // Pequeña pausa entre mensajes
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      return { asignacionesActualizadas, enviadosDirectos, enviadosPorWeb };
    },
    onSuccess: ({ enviadosDirectos, enviadosPorWeb }) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-camarero'] });
      
      if (enviadosDirectos > 0 && enviadosPorWeb === 0) {
        toast.success(`✅ ${enviadosDirectos} mensaje${enviadosDirectos !== 1 ? 's' : ''} enviado${enviadosDirectos !== 1 ? 's' : ''} directamente por WhatsApp`);
      } else if (enviadosDirectos > 0 && enviadosPorWeb > 0) {
        toast.success(`✅ ${enviadosDirectos} enviados directamente, ${enviadosPorWeb} requieren WhatsApp Web`);
      } else {
        toast.success('Mensajes procesados correctamente');
      }
      
      setOpen(false);
      setSelectedCamareros([]);
      setPlantillaSeleccionada(null);
      setMensajePersonalizado('');
      setArchivoAdjunto(null);
      setArchivoUrl(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al enviar mensajes');
    }
  });

  // Eliminar duplicados de asignaciones por camarero_id
  const asignacionesUnicas = asignacionesArray.reduce((acc, asig) => {
    if (!acc.find(a => a.camarero_id === asig.camarero_id)) {
      acc.push(asig);
    }
    return acc;
  }, []);

  const camarerosAsignados = asignacionesUnicas
    .map(a => listaCamareros.find(c => c.id === a.camarero_id))
    .filter(Boolean);

  const toggleCamarero = (camareroId) => {
    setSelectedCamareros(prev => 
      prev.includes(camareroId) 
        ? prev.filter(id => id !== camareroId)
        : [...prev, camareroId]
    );
  };

  const seleccionarTodos = () => {
    setSelectedCamareros(camarerosAsignados.map(c => c.id));
  };

  const handleArchivoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no puede superar los 5MB');
        return;
      }
      setArchivoAdjunto(file);
      setArchivoUrl(null);
    }
  };

  // Cargar plantilla predeterminada al abrir
  useEffect(() => {
    if (open && plantillas.length > 0) {
      const predeterminada = plantillas.find(p => p.es_predeterminada);
      if (predeterminada) {
        setPlantillaSeleccionada(predeterminada.id);
      }
    }
  }, [open, plantillas]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={buttonVariant || "default"}
          size={buttonSize || "default"}
          className={!buttonVariant ? "bg-green-600 hover:bg-green-700" : ""}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {buttonText || "Enviar WhatsApp"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Enviar Confirmación por WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {loadingCamareros && !camareros ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Cargando camareros...</span>
            </div>
          ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium mb-2">Evento: {pedido.cliente}</h4>
              <p className="text-sm text-slate-600">
                {pedido.dia} • {pedido.entrada} • {pedido.lugar_evento}
              </p>
              {pedido.extra_transporte && (
                <p className="text-sm text-green-600 mt-1">✓ Incluye transporte</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Enviar desde el número de:</Label>
              <Select value={coordinadorId || ''} onValueChange={setCoordinadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un coordinador" />
                </SelectTrigger>
                <SelectContent>
                  {coordinadores.map(coord => (
                    <SelectItem key={coord.id} value={coord.id}>
                      {coord.nombre} {coord.telefono ? `(${coord.telefono})` : '(Sin teléfono)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {coordinadorId && !coordinadores.find(c => c.id === coordinadorId)?.telefono && (
                <p className="text-xs text-red-500">⚠️ Este coordinador no tiene teléfono configurado</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Plantilla de Mensaje</Label>
                <GestionPlantillas />
              </div>
              <Select value={plantillaSeleccionada || ''} onValueChange={setPlantillaSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plantilla o escribe personalizado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Mensaje Personalizado</SelectItem>
                  {plantillas.map(pl => (
                    <SelectItem key={pl.id} value={pl.id}>
                      {pl.nombre} {pl.es_predeterminada && '⭐'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(!plantillaSeleccionada || plantillaSeleccionada === 'none') && (
              <div className="space-y-2">
                <Label>Mensaje Personalizado</Label>
                <Textarea
                  value={mensajePersonalizado}
                  onChange={(e) => setMensajePersonalizado(e.target.value)}
                  placeholder="Escribe tu mensaje. Usa {{cliente}}, {{dia}}, {{lugar_evento}}, etc."
                  rows={6}
                />
                <p className="text-xs text-slate-500">
                  Campos: {'{{cliente}}'}, {'{{dia}}'}, {'{{lugar_evento}}'}, {'{{hora_entrada}}'}, {'{{camisa}}'}, {'{{link_confirmar}}'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Archivo Adjunto (opcional)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {archivoAdjunto ? archivoAdjunto.name : 'Seleccionar archivo (máx. 5MB)'}
                </Button>
                {archivoAdjunto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setArchivoAdjunto(null); setArchivoUrl(null); }}
                  >
                    ✕
                  </Button>
                )}
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleArchivoChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Seleccionar Camareros ({camarerosAsignados.length})</h4>
                <Button variant="outline" size="sm" onClick={seleccionarTodos}>
                  Seleccionar Todos
                </Button>
              </div>

              <div className="space-y-2">
                {camarerosAsignados.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No hay camareros asignados a este evento
                  </p>
                ) : (
                  camarerosAsignados.map(camarero => (
                    <div 
                      key={camarero.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50"
                    >
                    <Checkbox
                      checked={selectedCamareros.includes(camarero.id)}
                      onCheckedChange={() => toggleCamarero(camarero.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{camarero.nombre}</p>
                      <p className="text-sm text-slate-500">{camarero.telefono || 'Sin teléfono'}</p>
                    </div>
                    {!camarero.telefono && (
                      <span className="text-xs text-red-500">Sin teléfono</span>
                    )}
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-white flex flex-wrap justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => enviarMutation.mutate()}
            disabled={selectedCamareros.length === 0 || !coordinadorId || enviarMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {enviarMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar a {selectedCamareros.length} camarero(s)
          </Button>
          <Button
            onClick={() => { setOpen(false); setMostrarEnvioMasivo(true); }}
            variant="outline"
          >
            Envío Masivo Mejorado
          </Button>
        </div>
      </DialogContent>

      <EnvioMasivoWhatsApp
        pedidoId={pedido?.id}
        camarerosPredefinidos={selectedCamareros}
        open={mostrarEnvioMasivo}
        onClose={() => setMostrarEnvioMasivo(false)}
      />
    </Dialog>
  );
}