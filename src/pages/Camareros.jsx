import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, User, Star, Search, Filter, Award, MessageSquare, CalendarDays, UserCheck, Trash2, Download, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import GestionCamareros from '../components/asignacion/GestionCamareros';
import ValoracionCamarero from '../components/camareros/ValoracionCamarero';
import ValoracionesHistorial from '../components/camareros/ValoracionesHistorial';
import DocumentosWidget from '../components/camareros/DocumentosWidget';
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
  const importInputRef = useState(null);

  const exportarExcel = () => {
    const headers = ['Código', 'Nombre', 'Teléfono', 'Email', 'Disponible', 'En Reserva', 'Estado', 'Especialidad', 'Nivel Experiencia', 'Años Experiencia', 'Habilidades', 'Idiomas', 'Dirección', 'Notas', 'Valoración Promedio', 'Total Valoraciones'];
    const filas = camareros.map(c => [
      c.codigo || '',
      c.nombre || '',
      c.telefono || '',
      c.email || '',
      c.disponible ? 'Sí' : 'No',
      c.en_reserva ? 'Sí' : 'No',
      c.estado_actual || '',
      c.especialidad || '',
      c.nivel_experiencia || '',
      c.experiencia_anios || '',
      (c.habilidades || []).join(', '),
      (c.idiomas || []).join(', '),
      c.direccion || '',
      c.notas || '',
      c.valoracion_promedio || '',
      c.total_valoraciones || 0
    ]);

    const csvContent = [headers, ...filas]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camareros_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${camareros.length} camareros exportados`);
  };

  const importarExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { toast.error('El archivo no tiene datos'); return; }

    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

    const parsear = (row) => {
      const vals = [];
      let cur = '', inQ = false;
      for (const ch of row) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === sep[0] && !inQ) { vals.push(cur); cur = ''; }
        else { cur += ch; }
      }
      vals.push(cur);
      return vals.map(v => v.replace(/^"|"$/g, '').trim());
    };

    const idx = (name) => headers.findIndex(h => h.includes(name));

    let creados = 0, actualizados = 0, errores = 0;
    for (let i = 1; i < lines.length; i++) {
      const vals = parsear(lines[i]);
      if (!vals[idx('nombre')] && !vals[0]) continue;
      try {
        const data = {
          codigo: vals[idx('código')] || vals[idx('codigo')] || vals[0] || '',
          nombre: vals[idx('nombre')] || vals[1] || '',
          telefono: vals[idx('teléfono')] || vals[idx('telefono')] || vals[2] || '',
          email: vals[idx('email')] || vals[3] || '',
          disponible: (vals[idx('disponible')] || '').toLowerCase() !== 'no',
          en_reserva: (vals[idx('en reserva')] || vals[idx('reserva')] || '').toLowerCase() === 'sí' || (vals[idx('en reserva')] || '').toLowerCase() === 'si',
          especialidad: vals[idx('especialidad')] || 'general',
          nivel_experiencia: vals[idx('nivel')] || 'intermedio',
          experiencia_anios: parseFloat(vals[idx('años')]) || undefined,
          habilidades: vals[idx('habilidades')] ? vals[idx('habilidades')].split(',').map(h => h.trim()).filter(Boolean) : [],
          idiomas: vals[idx('idiomas')] ? vals[idx('idiomas')].split(',').map(h => h.trim()).filter(Boolean) : [],
          direccion: vals[idx('dirección')] || vals[idx('direccion')] || '',
          notas: vals[idx('notas')] || '',
        };
        if (!data.nombre) continue;

        const existente = camareros.find(c => c.codigo === data.codigo || c.email === data.email);
        if (existente) {
          await base44.entities.Camarero.update(existente.id, data);
          actualizados++;
        } else {
          await base44.entities.Camarero.create(data);
          creados++;
        }
      } catch { errores++; }
    }

    queryClient.invalidateQueries({ queryKey: ['camareros'] });
    toast.success(`Importación: ${creados} creados, ${actualizados} actualizados${errores ? `, ${errores} errores` : ''}`);
  };

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
    },
    onError: (error) => {
      console.error('Error al actualizar disponibilidad:', error);
      toast.error('Error al actualizar disponibilidad: ' + (error.message || 'Error desconocido'));
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
                        <DocumentosWidget camarero={camarero} />
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerHistorial(camarero);
                          }}
                          className="flex items-center gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 px-2"
                        >
                          <Star className="w-4 h-4 fill-amber-400" />
                          <span className="font-semibold">{camarero.valoracion_promedio.toFixed(1)}</span>
                          <span className="text-xs text-slate-400">({camarero.total_valoraciones})</span>
                        </Button>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleValorar(camarero);
                          }}
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Valorar"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerHistorial(camarero);
                          }}
                          className="h-8 w-8"
                          title="Ver comentarios"
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar camarero?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará a <strong>{camarero.nombre}</strong> y todos sus datos asociados. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(camarero.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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

        {showHistorial && camareroHistorial && (
          <Dialog open={showHistorial} onOpenChange={setShowHistorial}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Historial de Valoraciones - {camareroHistorial.nombre}</DialogTitle>
              </DialogHeader>
              <ValoracionesHistorial camareroId={camareroHistorial.id} />
            </DialogContent>
          </Dialog>
        )}

        <GestionDisponibilidad
          open={showGestionDisponibilidad}
          onClose={() => setShowGestionDisponibilidad(false)}
        />
      </div>
    </div>
  );
}