import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, User, Star, Search, Filter, Award, MessageSquare, CheckCircle, XCircle, CalendarDays, UserCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import GestionCamareros from '../components/asignacion/GestionCamareros';
import ValoracionCamarero from '../components/camareros/ValoracionCamarero';
import ValoracionesHistorial from '../components/camareros/ValoracionesHistorial';
import GestionDisponibilidad from '../components/camareros/GestionDisponibilidad';

const especialidadColors = {
  general: 'bg-slate-100 text-slate-700',
  cocteleria: 'bg-purple-100 text-purple-700',
  banquetes: 'bg-blue-100 text-blue-700',
  eventos_vip: 'bg-amber-100 text-amber-700',
  buffet: 'bg-emerald-100 text-emerald-700'
};

const nivelExperienciaColors = {
  junior: 'bg-blue-100 text-blue-700',
  intermedio: 'bg-emerald-100 text-emerald-700',
  senior: 'bg-amber-100 text-amber-700',
  experto: 'bg-purple-100 text-purple-700'
};

export default function Camareros() {
  const [showForm, setShowForm] = useState(false);
  const [editingCamarero, setEditingCamarero] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState('todos');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('todos');
  const [filtroHabilidad, setFiltroHabilidad] = useState('todos');
  const [mostrarReserva, setMostrarReserva] = useState(false);
  const [showValoracion, setShowValoracion] = useState(false);
  const [camareroParaValorar, setCamareroParaValorar] = useState(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [camareroHistorial, setCamareroHistorial] = useState(null);
  const [showGestionDisponibilidad, setShowGestionDisponibilidad] = useState(false);

  const queryClient = useQueryClient();

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: async () => {
      try {
        return await base44.entities.Camarero.list('-created_date');
      } catch (error) {
        console.error('Error cargando camareros:', error);
        return [];
      }
    }
  });

  const toggleDisponibilidadMutation = useMutation({
    mutationFn: ({ id, disponible }) => base44.entities.Camarero.update(id, { disponible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      toast.success('Disponibilidad actualizada');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Camarero.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      toast.success('Camarero eliminado correctamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar camarero: ' + error.message);
    }
  });

  // Obtener habilidades únicas
  const todasHabilidades = [...new Set(camareros.flatMap(c => c.habilidades || []))].sort();

  // Filtrar camareros activos y en reserva
  const camarerosFiltrados = camareros.filter(c => {
    // Filtrar por estado de reserva
    if (mostrarReserva) {
      if (!c.en_reserva) return false;
    } else {
      if (c.en_reserva) return false;
    }

    const matchBusqueda = !busqueda || 
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email?.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchDisponibilidad = filtroDisponibilidad === 'todos' || 
      (filtroDisponibilidad === 'disponible' && c.disponible) ||
      (filtroDisponibilidad === 'no_disponible' && !c.disponible);
    
    const matchEspecialidad = filtroEspecialidad === 'todos' || c.especialidad === filtroEspecialidad;
    
    const matchHabilidad = filtroHabilidad === 'todos' || c.habilidades?.includes(filtroHabilidad);
    
    return matchBusqueda && matchDisponibilidad && matchEspecialidad && matchHabilidad;
  });

  const camarerosFiltradosActivos = camareros.filter(c => !c.en_reserva);
  const camarerosFiltradosReserva = camareros.filter(c => c.en_reserva);

  const handleEdit = (camarero) => {
    setEditingCamarero(camarero);
    setShowForm(true);
  };

  const handleValorar = (camarero) => {
    setCamareroParaValorar(camarero);
    setShowValoracion(true);
  };

  const handleVerHistorial = (camarero) => {
    setCamareroHistorial(camarero);
    setShowHistorial(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <User className="w-8 h-8 text-[#1e3a5f]" />
              Gestión de Camareros
            </h1>
            <p className="text-slate-500 mt-1">Gestiona tu equipo de camareros, habilidades y valoraciones</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowGestionDisponibilidad(true)}
              variant="outline"
              className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Disponibilidad
            </Button>
            <Link to={createPageUrl('Disponibilidad')}>
              <Button variant="outline">
                <CalendarDays className="w-4 h-4 mr-2" />
                Calendario
              </Button>
            </Link>
            <Button 
              onClick={() => { setEditingCamarero(null); setShowForm(true); }}
              className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Camarero
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Activos</p>
            <p className="text-2xl font-bold text-slate-800">{camarerosFiltradosActivos.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">En Reserva</p>
            <p className="text-2xl font-bold text-amber-600">{camarerosFiltradosReserva.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Disponibles</p>
            <p className="text-2xl font-bold text-emerald-600">
              {camareros.filter(c => c.disponible && !c.en_reserva).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">No Disponibles</p>
            <p className="text-2xl font-bold text-red-600">
              {camareros.filter(c => !c.disponible && !c.en_reserva).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Valoración Media</p>
            <p className="text-2xl font-bold text-amber-600 flex items-center gap-1">
              <Star className="w-5 h-5 fill-amber-400" />
              {(camareros.reduce((sum, c) => sum + (c.valoracion_promedio || 0), 0) / camareros.length || 0).toFixed(1)}
            </p>
          </Card>
        </div>

        {/* Tabs para Activos/Reserva */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={!mostrarReserva ? 'default' : 'outline'}
            onClick={() => setMostrarReserva(false)}
            className={!mostrarReserva ? 'bg-[#1e3a5f] hover:bg-[#152a45]' : ''}
          >
            Camareros Activos ({camarerosFiltradosActivos.length})
          </Button>
          <Button
            variant={mostrarReserva ? 'default' : 'outline'}
            onClick={() => setMostrarReserva(true)}
            className={mostrarReserva ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-600 text-amber-600 hover:bg-amber-50'}
          >
            En Reserva ({camarerosFiltradosReserva.length})
          </Button>
        </div>

        {/* Filtros */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar camarero..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroDisponibilidad} onValueChange={setFiltroDisponibilidad}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="disponible">Disponibles</SelectItem>
                <SelectItem value="no_disponible">No Disponibles</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroEspecialidad} onValueChange={setFiltroEspecialidad}>
              <SelectTrigger>
                <Award className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las especialidades</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="cocteleria">Coctelería</SelectItem>
                <SelectItem value="banquetes">Banquetes</SelectItem>
                <SelectItem value="eventos_vip">Eventos VIP</SelectItem>
                <SelectItem value="buffet">Buffet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroHabilidad} onValueChange={setFiltroHabilidad}>
              <SelectTrigger>
                <Award className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las habilidades</SelectItem>
                {todasHabilidades.map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(busqueda || filtroDisponibilidad !== 'todos' || filtroEspecialidad !== 'todos' || filtroHabilidad !== 'todos') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setBusqueda('');
                  setFiltroDisponibilidad('todos');
                  setFiltroEspecialidad('todos');
                  setFiltroHabilidad('todos');
                }}
              >
                Limpiar Filtros
              </Button>
            )}
          </div>
        </Card>

        {/* Tabla */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Camarero</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Habilidades</TableHead>
                  <TableHead className="text-center">Valoración</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {camarerosFiltrados.map(camarero => (
                  <TableRow key={camarero.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-800">{camarero.nombre}</p>
                        <p className="text-xs text-slate-500 font-mono">#{camarero.codigo}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600">
                        {camarero.telefono && <p>{camarero.telefono}</p>}
                        {camarero.email && <p className="text-xs truncate max-w-[200px]">{camarero.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        camarero.estado_actual === 'disponible' ? 'bg-emerald-100 text-emerald-700' :
                        camarero.estado_actual === 'ocupado' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }>
                        {camarero.estado_actual === 'disponible' ? 'Disponible' :
                         camarero.estado_actual === 'ocupado' ? 'Ocupado' :
                         'No Disponible'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${especialidadColors[camarero.especialidad] || especialidadColors.general} text-xs`}>
                        {camarero.especialidad?.replace('_', ' ') || 'general'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {camarero.habilidades?.slice(0, 3).map(h => (
                          <Badge key={h} variant="outline" className="text-xs">
                            {h}
                          </Badge>
                        ))}
                        {camarero.habilidades?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{camarero.habilidades.length - 3}
                          </Badge>
                        )}
                        {(!camarero.habilidades || camarero.habilidades.length === 0) && (
                          <span className="text-xs text-slate-400">Sin habilidades</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {camarero.valoracion_promedio > 0 ? (
                        <button
                          onClick={() => handleVerHistorial(camarero)}
                          className="flex items-center gap-1 text-amber-600 hover:text-amber-700 mx-auto"
                        >
                          <Star className="w-4 h-4 fill-amber-400" />
                          <span className="font-semibold">{camarero.valoracion_promedio.toFixed(1)}</span>
                          <span className="text-xs text-slate-400">({camarero.total_valoraciones})</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Sin valoraciones</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={createPageUrl('PerfilCamarero') + '?id=' + camarero.id}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            title="Ver perfil"
                          >
                            <User className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleValorar(camarero)}
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Valorar"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleVerHistorial(camarero)}
                          className="h-8 w-8"
                          title="Ver valoraciones"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEdit(camarero)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (confirm(`¿Estás seguro de eliminar a ${camarero.nombre}? Esta acción no se puede deshacer.`)) {
                              deleteMutation.mutate(camarero.id);
                            }
                          }}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {camarerosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No se encontraron camareros
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Modals */}
        <GestionCamareros
          open={showForm}
          onOpenChange={setShowForm}
          editingCamarero={editingCamarero}
        />

        {camareroParaValorar && (
          <ValoracionCamarero
            open={showValoracion}
            onOpenChange={setShowValoracion}
            camarero={camareroParaValorar}
          />
        )}

        {camareroHistorial && (
          <ValoracionesHistorial
            open={showHistorial}
            onOpenChange={setShowHistorial}
            camarero={camareroHistorial}
          />
        )}

        <GestionDisponibilidad
          open={showGestionDisponibilidad}
          onClose={() => setShowGestionDisponibilidad(false)}
        />
      </div>
    </div>
  );
}