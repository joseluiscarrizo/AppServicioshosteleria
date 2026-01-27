import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, ClipboardList, Search, MapPin, Clock, Calendar, Calendar as CalendarIcon, RefreshCw, X, ChevronRight, Star, Filter, Award, GripVertical, Sparkles, Ban, Copy, Repeat, Pencil, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import TareasService from '../components/camareros/TareasService';
import CalendarioAsignaciones from '../components/asignacion/CalendarioAsignaciones';
import CalendarioAsignacionRapida from '../components/asignacion/CalendarioAsignacionRapida';
import CargaCamareros from '../components/asignacion/CargaCamareros';
import CargaTrabajoCamareros from '../components/asignacion/CargaTrabajoCamareros';
import AsignacionAutomatica from '../components/asignacion/AsignacionAutomatica';
import ReglasAsignacion from '../components/asignacion/ReglasAsignacion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EdicionRapida from '../components/pedidos/EdicionRapida';
import DuplicarEvento from '../components/pedidos/DuplicarEvento';
import EventoRecurrente from '../components/pedidos/EventoRecurrente';
import PedidoFormNuevo from '../components/pedidos/PedidoFormNuevo';

const estadoColors = {
  pendiente: 'bg-slate-100 text-slate-700 border-slate-200',
  enviado: 'bg-orange-100 text-orange-700 border-orange-300',
  confirmado: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  alta: 'bg-blue-100 text-blue-700 border-blue-300'
};

const estadoBgColors = {
  pendiente: 'bg-slate-50',
  enviado: 'bg-orange-50',
  confirmado: 'bg-emerald-50',
  alta: 'bg-blue-50'
};

export default function Asignacion() {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [filtroHabilidad, setFiltroHabilidad] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [mostrarCarga, setMostrarCarga] = useState(false);
  const [showAsignacionAuto, setShowAsignacionAuto] = useState(false);
  const [showReglas, setShowReglas] = useState(false);
  const [vistaCalendario, setVistaCalendario] = useState('avanzado'); // 'avanzado' o 'clasico'
  const [edicionRapida, setEdicionRapida] = useState({ open: false, pedido: null, campo: null });
  const [duplicarDialog, setDuplicarDialog] = useState({ open: false, pedido: null });
  const [recurrenteDialog, setRecurrenteDialog] = useState({ open: false, pedido: null });
  const [editingSalida, setEditingSalida] = useState({ pedidoId: null, turnoIndex: null, camareroIndex: null });
  const [showForm, setShowForm] = useState(false);
  const [editingPedido, setEditingPedido] = useState(null);

  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list('-dia', 200)
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 1000)
  });

  const createAsignacionMutation = useMutation({
    mutationFn: async (data) => {
      const asignacion = await base44.entities.AsignacionCamarero.create(data);
      return { asignacion, data };
    },
    onSuccess: async ({ asignacion, data }) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      
      // Enviar notificación al camarero
      const pedido = pedidos.find(p => p.id === data.pedido_id);
      const camarero = camareros.find(c => c.id === data.camarero_id);
      
      if (pedido && camarero) {
        try {
          // Construir mensaje según si tiene transporte o no
          let mensaje = `📅 Día: ${pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : 'Por confirmar'}\n`;
          mensaje += `👤 Cliente: ${pedido.cliente}\n`;
          mensaje += `📍 Lugar del Evento: ${pedido.lugar_evento || 'Por confirmar'}\n`;
          mensaje += `🕐 Hora de entrada: ${data.hora_entrada || pedido.entrada || '-'}\n\n`;

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
                const horaEntrada = data.hora_entrada || pedido.entrada;
                if (horaEntrada) {
                  const [horas, minutos] = horaEntrada.split(':').map(Number);
                  const horaEntradaDate = new Date();
                  horaEntradaDate.setHours(horas, minutos, 0);
                  horaEntradaDate.setMinutes(horaEntradaDate.getMinutes() - minutosViaje - 15);
                  
                  mensaje += `🚗 Hora de encuentro: ${horaEntradaDate.getHours().toString().padStart(2, '0')}:${horaEntradaDate.getMinutes().toString().padStart(2, '0')}\n`;
                }
              } catch (e) {
                console.error('Error calculando distancia:', e);
                mensaje += `🚗 Hora de encuentro: Por confirmar\n`;
              }
            }
            
            mensaje += `📌 Punto de encuentro: ${puntoEncuentro}\n\n`;
          } else {
            // Sin transporte - mostrar link de Google Maps
            if (pedido.link_ubicacion) {
              mensaje += `🗺️ Ubicación: ${pedido.link_ubicacion}\n\n`;
            }
          }

          mensaje += `👔 Uniforme: Zapatos, pantalón y delantal. Todo de color negro\n`;
          mensaje += `👕 Camisa: ${pedido.camisa || 'blanca'}\n`;
          mensaje += `✨ Uniforme Impoluto.\n\n`;
          mensaje += `⏰ Presentarse 15 minutos antes para estar a la hora exacta en el puesto de trabajo.`;

          // Crear notificación al camarero
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
            hora_entrada: data.hora_entrada,
            hora_salida: data.hora_salida,
            leida: false,
            respondida: false,
            respuesta: 'pendiente'
          });

          // Crear tareas automáticas
          await TareasService.crearTareasIniciales(asignacion, pedido, camarero);
          
          // Notificar al coordinador del camarero
          if (camarero.coordinador_id) {
            const coords = await base44.entities.Coordinador.filter({ id: camarero.coordinador_id });
            const coordinador = coords[0];
            
            if (coordinador) {
              const mensajeNotif = `Se ha asignado a ${camarero.nombre} al servicio de ${pedido.cliente} el ${pedido.dia ? format(new Date(pedido.dia), 'dd/MM/yyyy', { locale: es }) : 'fecha pendiente'}`;
              
              // Notificación in-app al coordinador
              await base44.entities.Notificacion.create({
                tipo: 'estado_cambio',
                titulo: '👤 Nueva Asignación de Camarero',
                mensaje: mensajeNotif,
                prioridad: 'media',
                pedido_id: pedido.id,
                coordinador: coordinador.nombre,
                email_enviado: false
              });
              
              // Enviar email al coordinador
              if (coordinador.email && coordinador.notificaciones_email) {
                try {
                  await base44.integrations.Core.SendEmail({
                    to: coordinador.email,
                    subject: `Nueva Asignación: ${camarero.nombre} - ${pedido.cliente}`,
                    body: `
Hola ${coordinador.nombre},

Se ha asignado un nuevo servicio a tu camarero ${camarero.nombre}:

👤 Camarero: ${camarero.nombre} (#${camarero.codigo})
📋 Cliente: ${pedido.cliente}
📅 Fecha: ${pedido.dia ? format(new Date(pedido.dia), "dd 'de' MMMM yyyy", { locale: es }) : 'Por confirmar'}
🕐 Horario: ${pedido.entrada || '-'} - ${pedido.salida || '-'}
📍 Ubicación: ${pedido.lugar_evento || 'Por confirmar'}
${pedido.camisa ? `👔 Camisa: ${pedido.camisa}` : ''}

El camarero ha sido notificado y debe confirmar su asistencia.

Saludos,
Sistema de Gestión de Camareros
                    `
                  });
                  
                  // Marcar email como enviado
                  const notifCreada = await base44.entities.Notificacion.filter({ 
                    mensaje: mensajeNotif 
                  });
                  if (notifCreada[0]) {
                    await base44.entities.Notificacion.update(notifCreada[0].id, { 
                      email_enviado: true 
                    });
                  }
                } catch (emailError) {
                  console.error('Error enviando email al coordinador:', emailError);
                }
              }
            }
          }
        } catch (e) {
          console.error('Error enviando notificación o creando tareas:', e);
        }
      }
      
      toast.success('Camarero asignado y notificado');
    }
  });

  const updateAsignacionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AsignacionCamarero.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    }
  });

  const deleteAsignacionMutation = useMutation({
    mutationFn: async (asignacion) => {
      // Eliminar tareas asociadas primero
      await TareasService.eliminarTareasAsignacion(asignacion.id);
      // Eliminar asignación
      await base44.entities.AsignacionCamarero.delete(asignacion.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('Asignación eliminada');
    }
  });

  const updatePedidoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pedido.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setEditingSalida({ pedidoId: null, turnoIndex: null, camareroIndex: null });
      setShowForm(false);
      setEditingPedido(null);
      toast.success('Pedido actualizado');
    }
  });

  const deletePedidoMutation = useMutation({
    mutationFn: (id) => base44.entities.Pedido.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido eliminado');
    }
  });

  // Obtener asignaciones de un pedido
  const getAsignacionesPedido = (pedidoId) => {
    return asignaciones.filter(a => a.pedido_id === pedidoId);
  };

  // Calcular estado del pedido
  const getEstadoPedido = (pedido) => {
    const asignacionesPedido = getAsignacionesPedido(pedido.id);
    const cantidadNecesaria = pedido.cantidad_camareros || 0;
    
    if (asignacionesPedido.length === 0 || asignacionesPedido.length < cantidadNecesaria) {
      return 'incompleto'; // Rojo - faltan camareros
    }
    
    const todosConfirmados = asignacionesPedido.every(a => a.estado === 'confirmado');
    const todosAlta = asignacionesPedido.every(a => a.estado === 'alta');
    
    if (todosAlta) return 'alta'; // Azul
    if (todosConfirmados) return 'completo'; // Verde
    return 'incompleto'; // Rojo
  };

  // Verificar si un camarero puede ser asignado (regla de 6 horas)
  const puedoAsignarCamarero = (camareroId, pedido) => {
    const asignacionesCamarero = asignaciones.filter(a => a.camarero_id === camareroId);
    
    for (const asig of asignacionesCamarero) {
      if (asig.fecha_pedido === pedido.dia) {
        // Mismo día, verificar horas
        const horaEntradaNueva = pedido.entrada ? parseInt(pedido.entrada.split(':')[0]) : 0;
        const horaSalidaExistente = asig.hora_salida ? parseInt(asig.hora_salida.split(':')[0]) : 0;
        const horaEntradaExistente = asig.hora_entrada ? parseInt(asig.hora_entrada.split(':')[0]) : 0;
        const horaSalidaNueva = pedido.salida ? parseInt(pedido.salida.split(':')[0]) : 24;
        
        // Verificar solapamiento o menos de 6 horas de diferencia
        const diff1 = Math.abs(horaEntradaNueva - horaSalidaExistente);
        const diff2 = Math.abs(horaEntradaExistente - horaSalidaNueva);
        
        if (diff1 < 6 && diff2 < 6) {
          return false;
        }
      }
    }
    return true;
  };

  // Obtener camareros disponibles para un pedido (con filtros de habilidades)
  const getCamarerosDisponibles = (pedido) => {
    const asignacionesPedido = getAsignacionesPedido(pedido.id);
    const idsAsignados = asignacionesPedido.map(a => a.camarero_id);
    
    return camareros.filter(c => {
      if (idsAsignados.includes(c.id)) return false;
      if (!c.disponible) return false;
      if (!puedoAsignarCamarero(c.id, pedido)) return false;
      
      // Filtro por especialidad requerida
      if (pedido.especialidad_requerida && pedido.especialidad_requerida !== 'general') {
        if (c.especialidad !== pedido.especialidad_requerida) return false;
      }
      
      // Filtro por habilidades requeridas
      if (pedido.habilidades_requeridas?.length > 0) {
        const tieneHabilidades = pedido.habilidades_requeridas.every(h => 
          c.habilidades?.includes(h)
        );
        if (!tieneHabilidades) return false;
      }
      
      // Filtro por idiomas requeridos
      if (pedido.idiomas_requeridos?.length > 0) {
        const tieneIdiomas = pedido.idiomas_requeridos.every(i => 
          c.idiomas?.includes(i)
        );
        if (!tieneIdiomas) return false;
      }
      
      // Filtros manuales del coordinador
      if (filtroEspecialidad && c.especialidad !== filtroEspecialidad) return false;
      if (filtroHabilidad && !c.habilidades?.includes(filtroHabilidad)) return false;
      
      return true;
    }).sort((a, b) => (b.valoracion_promedio || 0) - (a.valoracion_promedio || 0)); // Ordenar por valoración
  };
  
  // Obtener todas las habilidades únicas
  const todasHabilidades = useMemo(() => {
    const habs = new Set();
    camareros.forEach(c => c.habilidades?.forEach(h => habs.add(h)));
    return Array.from(habs).sort();
  }, [camareros]);

  const handleAsignarCamarero = (pedido, camarero, turnoIdx = null, posicionSlot = null) => {
    // Verificar que no se exceda el límite de camareros
    const cantidadNecesaria = pedido.turnos?.length > 0 
      ? pedido.turnos.reduce((sum, t) => sum + (t.cantidad_camareros || 0), 0)
      : (pedido.cantidad_camareros || 0);
    
    const asignacionesActuales = getAsignacionesPedido(pedido.id);
    
    // Verificar si ya existe una asignación en esa posición
    if (posicionSlot !== null) {
      const asignacionExistente = asignacionesActuales.find(
        a => a.turno_index === turnoIdx && a.posicion_slot === posicionSlot
      );
      if (asignacionExistente) {
        toast.error('Ya hay un camarero asignado en esa posición');
        return;
      }
    }
    
    if (asignacionesActuales.length >= cantidadNecesaria) {
      toast.error('Ya se alcanzó el número máximo de camareros para este pedido');
      return;
    }
    
    // Determinar horario según turno
    let horaEntrada = pedido.entrada;
    let horaSalida = pedido.salida;
    
    if (turnoIdx !== null && pedido.turnos && pedido.turnos[turnoIdx]) {
      const turno = pedido.turnos[turnoIdx];
      horaEntrada = turno.entrada;
      horaSalida = turno.salida;
    }
    
    createAsignacionMutation.mutate({
      pedido_id: pedido.id,
      camarero_id: camarero.id,
      camarero_nombre: camarero.nombre,
      camarero_codigo: camarero.codigo,
      estado: 'pendiente',
      fecha_pedido: pedido.dia,
      hora_entrada: horaEntrada,
      hora_salida: horaSalida,
      turno_index: turnoIdx,
      posicion_slot: posicionSlot
    });
  };

  const handleCambiarEstado = (asignacionId, nuevoEstado) => {
    updateAsignacionMutation.mutate({ id: asignacionId, data: { estado: nuevoEstado } });
  };

  const handleEditPedido = (pedido) => {
    setEditingPedido(pedido);
    setShowForm(true);
  };

  const handleSubmitPedido = (dataFromForm) => {
    if (editingPedido) {
      updatePedidoMutation.mutate({ id: editingPedido.id, data: dataFromForm });
    }
  };

  const handleSalidaChange = (pedido, turnoIndex, camareroIndex, nuevaSalida) => {
    const turnosActualizados = [...(pedido.turnos || [])];
    if (turnosActualizados[turnoIndex]) {
      turnosActualizados[turnoIndex] = {
        ...turnosActualizados[turnoIndex],
        salida: nuevaSalida
      };
      
      // Calcular horas
      const entrada = turnosActualizados[turnoIndex].entrada;
      if (entrada && nuevaSalida) {
        const [hE, mE] = entrada.split(':').map(Number);
        const [hS, mS] = nuevaSalida.split(':').map(Number);
        let horas = hS - hE;
        let minutos = mS - mE;
        if (minutos < 0) {
          horas -= 1;
          minutos += 60;
        }
        if (horas < 0) horas += 24;
        turnosActualizados[turnoIndex].t_horas = horas + minutos / 60;
      }
      
      updatePedidoMutation.mutate({
        id: pedido.id,
        data: { turnos: turnosActualizados }
      });
    }
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    
    // Si no hay destino o se suelta en el mismo lugar, no hacer nada
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    // Solo procesar si el destino es un slot (no la lista de camareros)
    if (destination.droppableId === 'camareros-disponibles') return;
    
    const camareroId = draggableId;
    const camarero = camareros.find(c => c.id === camareroId);
    if (!camarero || !selectedPedido) return;
    
    const destinationId = destination.droppableId;
    
    // Extraer información del droppable: "slot-turno-0-posicion-2" o "slot-general-3"
    const turnoMatch = destinationId.match(/slot-turno-(\d+)-posicion-(\d+)/);
    const generalMatch = destinationId.match(/slot-general-(\d+)/);
    
    let turnoIdx = null;
    let posicionSlot = null;
    
    if (turnoMatch) {
      turnoIdx = parseInt(turnoMatch[1]);
      posicionSlot = parseInt(turnoMatch[2]);
    } else if (generalMatch) {
      posicionSlot = parseInt(generalMatch[1]);
    }
    
    if (posicionSlot !== null) {
      handleAsignarCamarero(selectedPedido, camarero, turnoIdx, posicionSlot);
    }
  };

  const isLoading = loadingPedidos;

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col overflow-hidden">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-[#1e3a5f]" />
            Asignación de Camareros
          </h1>
          <p className="text-slate-500 mt-1">Asigna camareros a los pedidos con recomendaciones inteligentes</p>
        </div>

        {/* Selector de Vista */}
        <div className="mb-4">
          <Select value={vistaCalendario} onValueChange={setVistaCalendario}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="avanzado">📅 Calendario con Asignación Rápida</SelectItem>
              <SelectItem value="clasico">📋 Vista Clásica con Drag & Drop</SelectItem>
              <SelectItem value="reglas">⚙️ Configurar Reglas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Vista Calendario Avanzado con Asignación Rápida */}
        {vistaCalendario === 'avanzado' && (
          <CalendarioAsignacionRapida />
        )}

        {/* Vista de Reglas */}
        {vistaCalendario === 'reglas' && (
          <ReglasAsignacion />
        )}

        {/* Vista Clásica */}
        {vistaCalendario === 'clasico' && (
          <>
            {/* Calendario y Carga */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className={mostrarCarga ? 'lg:col-span-2' : 'lg:col-span-3'}>
                <CalendarioAsignaciones onSelectPedido={setSelectedPedido} />
              </div>
              {mostrarCarga && (
                <div>
                  <CargaTrabajoCamareros mes={new Date()} />
                </div>
              )}
            </div>

            {/* Controles */}
            <div className="mb-6 flex justify-between items-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMostrarCarga(!mostrarCarga)}
          >
            {mostrarCarga ? 'Ocultar' : 'Mostrar'} Carga de Trabajo
          </Button>

          {selectedPedido && (
            <Button 
              onClick={() => setShowAsignacionAuto(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Asignación Automática
            </Button>
          )}
        </div>

        {/* Asignación con Drag & Drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel Izquierdo: Lista de Camareros Disponibles */}
            <div>
                <Card className="h-[600px] flex flex-col">
                  <div className="p-4 border-b bg-slate-50">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#1e3a5f]" />
                      Camareros Disponibles
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      <Select value={filtroEspecialidad} onValueChange={setFiltroEspecialidad}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <Filter className="w-3 h-3 mr-1" />
                          <SelectValue placeholder="Especialidad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Todas</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="cocteleria">Coctelería</SelectItem>
                          <SelectItem value="banquetes">Banquetes</SelectItem>
                          <SelectItem value="eventos_vip">Eventos VIP</SelectItem>
                          <SelectItem value="buffet">Buffet</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filtroHabilidad} onValueChange={setFiltroHabilidad}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <Award className="w-3 h-3 mr-1" />
                          <SelectValue placeholder="Habilidad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Todas</SelectItem>
                          {todasHabilidades.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(filtroEspecialidad || filtroHabilidad) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs"
                          onClick={() => { setFiltroEspecialidad(''); setFiltroHabilidad(''); }}
                        >
                          Limpiar
                        </Button>
                      )}
                    </div>
                  </div>

                  <Droppable droppableId="camareros-disponibles" isDropDisabled={true}>
                    {(provided) => (
                      <ScrollArea className="flex-1 p-3" type="always">
                        <div className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
                          {selectedPedido && getCamarerosDisponibles(selectedPedido).map((camarero, index) => (
                            <Draggable key={camarero.id} draggableId={camarero.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 rounded-lg border-2 bg-white transition-all cursor-grab active:cursor-grabbing ${
                                    snapshot.isDragging 
                                      ? 'border-[#1e3a5f] shadow-lg rotate-2 scale-105' 
                                      : 'border-slate-200 hover:border-[#1e3a5f]/50 hover:shadow-md'
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    userSelect: 'none'
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <GripVertical className="w-4 h-4 text-slate-400" />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-800">{camarero.nombre}</span>
                                        {camarero.valoracion_promedio > 0 && (
                                          <span className="flex items-center gap-0.5 text-amber-500 text-xs">
                                            <Star className="w-3 h-3 fill-amber-400" />
                                            {camarero.valoracion_promedio.toFixed(1)}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-slate-500 font-mono">#{camarero.codigo}</span>
                                      {camarero.especialidad && (
                                        <Badge variant="outline" className="text-xs mt-1">
                                          {camarero.especialidad}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {!selectedPedido && (
                            <p className="text-center text-slate-400 py-8">
                              Selecciona un evento del calendario
                            </p>
                          )}
                          {selectedPedido && getCamarerosDisponibles(selectedPedido).length === 0 && (
                            <p className="text-center text-slate-400 py-8">
                              No hay camareros disponibles
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </Droppable>
                </Card>
              </div>

              {/* Panel Derecho: Slots de Asignación */}
              <div>
                <Card className="h-[600px] flex flex-col">
                  <div className="p-4 border-b bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          {selectedPedido ? selectedPedido.cliente : 'Slots de Asignación'}
                        </h3>
                        {selectedPedido && (
                          <>
                            <p className="text-sm text-slate-500">
                              {selectedPedido.lugar_evento} • {selectedPedido.dia ? format(new Date(selectedPedido.dia), 'dd MMM yyyy', { locale: es }) : ''}
                            </p>
                            {selectedPedido.turnos && selectedPedido.turnos.length > 0 ? (
                              <div className="mt-2 space-y-1">
                                {selectedPedido.turnos.map((turno, idx) => (
                                  <p key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    Turno {idx + 1}: {turno.entrada} - {turno.salida} 
                                    <Badge variant="outline" className="ml-1">
                                      {turno.cantidad_camareros} camareros
                                    </Badge>
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-600 mt-1">
                                {selectedPedido.entrada} - {selectedPedido.salida}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      {selectedPedido && (
                        <Button variant="ghost" size="icon" onClick={() => setSelectedPedido(null)}>
                          <X className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4" type="always">
                    {!selectedPedido ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-slate-400">
                          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Selecciona un evento del calendario para asignar camareros</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedPedido.turnos && selectedPedido.turnos.length > 0 ? (
                          // Vista con múltiples turnos
                          selectedPedido.turnos.map((turno, turnoIdx) => {
                            const totalAsignaciones = getAsignacionesPedido(selectedPedido.id);
                            const asignacionesTurno = totalAsignaciones.filter(a => a.turno_index === turnoIdx);

                            return (
                              <div key={turnoIdx}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-[#1e3a5f] text-white">
                                    Turno {turnoIdx + 1}
                                  </Badge>
                                  <span className="text-xs text-slate-600">
                                    {turno.entrada} - {turno.salida} • {turno.cantidad_camareros} camareros
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {Array.from({ length: turno.cantidad_camareros || 0 }).map((_, slotIdx) => {
                                    const asignacion = asignacionesTurno.find(a => a.posicion_slot === slotIdx);

                                    return (
                                      <Droppable key={slotIdx} droppableId={`slot-turno-${turnoIdx}-posicion-${slotIdx}`}>
                                        {(providedSlot, snapshotSlot) => (
                                          <div 
                                            ref={providedSlot.innerRef}
                                            {...providedSlot.droppableProps}
                                            className={`rounded-xl border-2 p-4 min-h-[120px] transition-all ${
                                              asignacion 
                                                ? `${estadoBgColors[asignacion.estado]} border-slate-200` 
                                                : snapshotSlot.isDraggingOver 
                                                ? 'bg-[#1e3a5f]/10 border-[#1e3a5f] border-dashed scale-105'
                                                : 'bg-slate-50 border-dashed border-slate-300'
                                            }`}
                                          >
                                            {asignacion ? (
                                              <div>
                                                <div className="flex items-center justify-between mb-2">
                                                  <span className="font-medium text-slate-800">
                                                    {asignacion.camarero_nombre}
                                                  </span>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 hover:text-red-500"
                                                    onClick={() => deleteAsignacionMutation.mutate(asignacion)}
                                                  >
                                                    <X className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                                <span className="text-xs text-slate-500 font-mono">
                                                  #{asignacion.camarero_codigo}
                                                </span>

                                                <Select 
                                                  value={asignacion.estado} 
                                                  onValueChange={(v) => handleCambiarEstado(asignacion.id, v)}
                                                >
                                                  <SelectTrigger className={`mt-3 h-8 text-sm ${estadoColors[asignacion.estado]}`}>
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="pendiente">Pendiente</SelectItem>
                                                    <SelectItem value="enviado">Enviado</SelectItem>
                                                    <SelectItem value="confirmado">Confirmado</SelectItem>
                                                    <SelectItem value="alta">Alta</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-center h-full">
                                                <p className="text-sm text-slate-400">
                                                  Arrastra aquí<br/>
                                                  <span className="text-xs">Slot {slotIdx + 1}</span>
                                                </p>
                                              </div>
                                            )}
                                            {providedSlot.placeholder}
                                          </div>
                                        )}
                                      </Droppable>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          // Vista con un solo horario
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array.from({ length: selectedPedido.cantidad_camareros || 0 }).map((_, index) => {
                              const asignacionesPedido = getAsignacionesPedido(selectedPedido.id);
                              const asignacion = asignacionesPedido.find(a => a.posicion_slot === index);

                              return (
                                <Droppable key={index} droppableId={`slot-general-${index}`}>
                                  {(providedSlot, snapshotSlot) => (
                                    <div 
                                      ref={providedSlot.innerRef}
                                      {...providedSlot.droppableProps}
                                      className={`rounded-xl border-2 p-4 min-h-[120px] transition-all ${
                                        asignacion 
                                          ? `${estadoBgColors[asignacion.estado]} border-slate-200` 
                                          : snapshotSlot.isDraggingOver 
                                          ? 'bg-[#1e3a5f]/10 border-[#1e3a5f] border-dashed scale-105'
                                          : 'bg-slate-50 border-dashed border-slate-300'
                                      }`}
                                    >
                                      {asignacion ? (
                                        <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-slate-800">
                                              {asignacion.camarero_nombre}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-slate-400 hover:text-red-500"
                                              onClick={() => deleteAsignacionMutation.mutate(asignacion)}
                                            >
                                              <X className="w-4 h-4" />
                                            </Button>
                                          </div>
                                          <span className="text-xs text-slate-500 font-mono">
                                            #{asignacion.camarero_codigo}
                                          </span>

                                          <Select 
                                            value={asignacion.estado} 
                                            onValueChange={(v) => handleCambiarEstado(asignacion.id, v)}
                                          >
                                            <SelectTrigger className={`mt-3 h-8 text-sm ${estadoColors[asignacion.estado]}`}>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="pendiente">Pendiente</SelectItem>
                                              <SelectItem value="enviado">Enviado</SelectItem>
                                              <SelectItem value="confirmado">Confirmado</SelectItem>
                                              <SelectItem value="alta">Alta</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center h-full">
                                          <p className="text-sm text-slate-400">
                                            Arrastra aquí<br/>
                                            <span className="text-xs">Slot {index + 1}</span>
                                          </p>
                                        </div>
                                      )}
                                      {providedSlot.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              </div>
            </div>
          </DragDropContext>

          {/* Modal de Asignación Automática */}
          <AsignacionAutomatica
            open={showAsignacionAuto}
            onClose={() => setShowAsignacionAuto(false)}
            pedido={selectedPedido}
          />
          </>
        )}

        {/* Tabla de Pedidos/Eventos */}
        <Card className="overflow-hidden mt-8">
          <div className="p-4 border-b bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#1e3a5f]" />
              Lista de Eventos
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Nº</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Lugar</TableHead>
                  <TableHead className="font-semibold text-center">Nº</TableHead>
                  <TableHead className="font-semibold">Camarero</TableHead>
                  <TableHead className="font-semibold">Día</TableHead>
                  <TableHead className="font-semibold">Entrada</TableHead>
                  <TableHead className="font-semibold">Salida</TableHead>
                  <TableHead className="font-semibold text-center">Horas</TableHead>
                  <TableHead className="font-semibold">Camisa</TableHead>
                  <TableHead className="font-semibold text-center">Transporte</TableHead>
                  <TableHead className="font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {pedidos.flatMap((pedido) => {
                    const turnos = pedido.turnos && pedido.turnos.length > 0 
                      ? pedido.turnos 
                      : [{ cantidad_camareros: pedido.cantidad_camareros || 0, entrada: pedido.entrada || '-', salida: pedido.salida || '-', t_horas: pedido.t_horas || 0 }];
                    
                    return turnos.flatMap((turno, turnoIndex) => {
                      const cantidadCamareros = turno.cantidad_camareros || 0;
                      const filasCamareros = Math.max(1, cantidadCamareros);
                      
                      return Array.from({ length: filasCamareros }, (_, camareroIndex) => {
                        const esPrimeraFila = turnoIndex === 0 && camareroIndex === 0;
                        const totalFilas = turnos.reduce((sum, t) => sum + Math.max(1, t.cantidad_camareros || 0), 0);
                        
                        // Calcular el número de camarero acumulado
                        let numeroCamarero = camareroIndex + 1;
                        for (let i = 0; i < turnoIndex; i++) {
                          numeroCamarero += Math.max(1, turnos[i].cantidad_camareros || 0);
                        }
                        
                        // Buscar asignación para este pedido
                        let asignacion = asignaciones.find(a => 
                          a.pedido_id === pedido.id && 
                          a.turno_index === turnoIndex &&
                          a.posicion_slot === camareroIndex
                        );
                        
                        if (!asignacion) {
                          const asignacionesPedido = asignaciones.filter(a => a.pedido_id === pedido.id);
                          if (asignacionesPedido[numeroCamarero - 1]) {
                            asignacion = asignacionesPedido[numeroCamarero - 1];
                          }
                        }
                        
                        return (
                          <motion.tr
                            key={`${pedido.id}-${turnoIndex}-${camareroIndex}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b hover:bg-slate-50/50"
                          >
                            {esPrimeraFila ? (
                              <>
                                <TableCell className="font-mono text-sm font-semibold text-[#1e3a5f]" rowSpan={totalFilas}>
                                  {pedido.codigo_pedido || '-'}
                                </TableCell>
                                <TableCell rowSpan={totalFilas}>
                                  <Badge
                                    className={`cursor-pointer ${
                                      pedido.estado_evento === 'cancelado' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                      pedido.estado_evento === 'finalizado' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' :
                                      pedido.estado_evento === 'en_curso' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                      'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    }`}
                                    onClick={() => setEdicionRapida({ open: true, pedido, campo: 'estado' })}
                                  >
                                    {pedido.estado_evento === 'cancelado' && <Ban className="w-3 h-3 mr-1" />}
                                    {pedido.estado_evento === 'cancelado' ? 'Cancelado' :
                                     pedido.estado_evento === 'finalizado' ? 'Finalizado' :
                                     pedido.estado_evento === 'en_curso' ? 'En Curso' : 'Planificado'}
                                  </Badge>
                                </TableCell>
                                <TableCell 
                                  className="font-medium cursor-pointer hover:text-[#1e3a5f] hover:underline"
                                  onClick={() => setEdicionRapida({ open: true, pedido, campo: 'cliente' })}
                                  rowSpan={totalFilas}
                                >
                                  {pedido.cliente}
                                </TableCell>
                                <TableCell 
                                  className="text-slate-600 cursor-pointer hover:text-[#1e3a5f] hover:underline"
                                  onClick={() => setEdicionRapida({ open: true, pedido, campo: 'lugar' })}
                                  rowSpan={totalFilas}
                                >
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {pedido.lugar_evento || 'Añadir lugar'}
                                  </div>
                                </TableCell>
                              </>
                            ) : null}
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold">
                                {numeroCamarero}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {asignacion ? (
                                <span className="text-slate-700">{asignacion.camarero_nombre}</span>
                              ) : (
                                <span className="text-slate-400 italic">Sin asignar</span>
                              )}
                            </TableCell>
                            {esPrimeraFila ? (
                              <TableCell
                                className="cursor-pointer hover:text-[#1e3a5f] hover:underline"
                                onClick={() => setEdicionRapida({ open: true, pedido, campo: 'fecha' })}
                                rowSpan={totalFilas}
                              >
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {pedido.dia ? format(new Date(pedido.dia), 'dd MMM yyyy', { locale: es }) : '-'}
                                </div>
                              </TableCell>
                            ) : null}
                            <TableCell className="font-mono text-sm">
                              {turno.entrada || '-'}
                            </TableCell>
                            <TableCell 
                              className="font-mono text-sm cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => setEditingSalida({ pedidoId: pedido.id, turnoIndex, camareroIndex })}
                            >
                              {editingSalida.pedidoId === pedido.id && 
                               editingSalida.turnoIndex === turnoIndex && 
                               editingSalida.camareroIndex === camareroIndex ? (
                                <Input
                                  type="time"
                                  defaultValue={turno.salida || ''}
                                  autoFocus
                                  className="h-8 w-24 text-xs"
                                  onBlur={(e) => {
                                    handleSalidaChange(pedido, turnoIndex, camareroIndex, e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSalidaChange(pedido, turnoIndex, camareroIndex, e.target.value);
                                    }
                                  }}
                                />
                              ) : (
                                <span className="hover:text-blue-600">
                                  {turno.salida || '-'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="px-2 py-1 rounded-full bg-slate-100 text-sm font-medium">
                                {turno.t_horas ? turno.t_horas.toFixed(1) : 0}h
                              </span>
                            </TableCell>
                            {esPrimeraFila ? (
                              <>
                                <TableCell rowSpan={totalFilas}>{pedido.camisa || '-'}</TableCell>
                                <TableCell className="text-center" rowSpan={totalFilas}>
                                  {pedido.extra_transporte ? (
                                    <span className="text-emerald-600">✓</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right" rowSpan={totalFilas}>
                                  <div className="flex justify-end gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => setDuplicarDialog({ open: true, pedido })}
                                      className="h-8 w-8"
                                      title="Duplicar evento"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => setRecurrenteDialog({ open: true, pedido })}
                                      className="h-8 w-8"
                                      title="Crear eventos recurrentes"
                                    >
                                      <Repeat className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleEditPedido(pedido)}
                                      className="h-8 w-8"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => deletePedidoMutation.mutate(pedido.id)}
                                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            ) : null}
                          </motion.tr>
                        );
                      });
                    });
                  })}
                </AnimatePresence>
                {pedidos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="h-32 text-center text-slate-500">
                      No hay pedidos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Modal Form */}
        <AnimatePresence>
          {showForm && (
            <PedidoFormNuevo
              pedido={editingPedido}
              onSubmit={handleSubmitPedido}
              onCancel={() => {
                setShowForm(false);
                setEditingPedido(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Edición Rápida */}
        <EdicionRapida
          pedido={edicionRapida.pedido}
          open={edicionRapida.open}
          onOpenChange={(open) => setEdicionRapida({ ...edicionRapida, open })}
          campo={edicionRapida.campo}
        />

        {/* Duplicar Evento */}
        <DuplicarEvento
          open={duplicarDialog.open}
          onOpenChange={(open) => setDuplicarDialog({ ...duplicarDialog, open })}
          pedidoOriginal={duplicarDialog.pedido}
        />

        {/* Evento Recurrente */}
        <EventoRecurrente
          open={recurrenteDialog.open}
          onOpenChange={(open) => setRecurrenteDialog({ ...recurrenteDialog, open })}
          pedidoBase={recurrenteDialog.pedido}
        />
      </div>
    </div>
  );
}