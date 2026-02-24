import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Mail, Bell, Phone, X, UserCog, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ConfiguracionRecordatorios from '../components/recordatorios/ConfiguracionRecordatorios';
import NotificacionesMasivas from '../components/notificaciones/NotificacionesMasivas';
import Logger from '../utils/logger';
import { validateEmail, validatePhoneNumber } from '../utils/validators';
import ErrorNotificationService from '../utils/errorNotificationService';
import { DatabaseError, handleWebhookError } from '../utils/webhookImprovements';

const errorNotifier = new ErrorNotificationService('');

export default function Coordinadores() {
  const [showForm, setShowForm] = useState(false);
  const [editingCoord, setEditingCoord] = useState(null);
  const [mostrarRecordatorios, setMostrarRecordatorios] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    email: '',
    telefono: '',
    notificaciones_email: true,
    notificaciones_app: true
  });
  const [formErrors, setFormErrors] = useState({});

  const queryClient = useQueryClient();

  const { data: coordinadores = [], isLoading } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list('nombre')
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      try {
        return await base44.entities.Coordinador.create(data);
      } catch (error) {
        throw new DatabaseError(error.message || 'Error al crear coordinador en la base de datos', { data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinadores'] });
      resetForm();
      toast.success('Coordinador añadido');
      Logger.info('Coordinador creado exitosamente');
    },
    onError: (error) => {
      Logger.error('Error al crear coordinador', { error: error.message });
      handleWebhookError(error, { operation: 'createCoordinador' });
      errorNotifier.notifyUser('Error al crear coordinador: ' + (error.message || 'Error desconocido'));
      toast.error('Error al crear coordinador: ' + (error.message || 'Error desconocido'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        return await base44.entities.Coordinador.update(id, data);
      } catch (error) {
        throw new DatabaseError(error.message || 'Error al actualizar coordinador en la base de datos', { id, data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinadores'] });
      resetForm();
      toast.success('Coordinador actualizado');
      Logger.info('Coordinador actualizado exitosamente');
    },
    onError: (error) => {
      Logger.error('Error al actualizar coordinador', { error: error.message });
      handleWebhookError(error, { operation: 'updateCoordinador' });
      toast.error('Error al actualizar coordinador: ' + (error.message || 'Error desconocido'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      try {
        return await base44.entities.Coordinador.delete(id);
      } catch (error) {
        throw new DatabaseError(error.message || 'Error al eliminar coordinador en la base de datos', { id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinadores'] });
      toast.success('Coordinador eliminado');
      Logger.info('Coordinador eliminado exitosamente');
    },
    onError: (error) => {
      Logger.error('Error al eliminar coordinador', { error: error.message });
      handleWebhookError(error, { operation: 'deleteCoordinador' });
      toast.error('Error al eliminar coordinador: ' + (error.message || 'Error desconocido'));
    }
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingCoord(null);
    setFormData({
      codigo: '',
      nombre: '',
      email: '',
      telefono: '',
      notificaciones_email: true,
      notificaciones_app: true
    });
    setFormErrors({});
    Logger.info('Formulario de coordinador reiniciado');
  };

  const handleEdit = (coord) => {
    setEditingCoord(coord);
    setFormData({
      codigo: coord.codigo || '',
      nombre: coord.nombre || '',
      email: coord.email || '',
      telefono: coord.telefono || '',
      notificaciones_email: coord.notificaciones_email ?? true,
      notificaciones_app: coord.notificaciones_app ?? true
    });
    setFormErrors({});
    setShowForm(true);
    Logger.info('Editando coordinador', { id: coord.id, nombre: coord.nombre });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.codigo.trim()) {
      errors.codigo = 'El código es obligatorio';
    }
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio';
    }
    if (!formData.email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'El formato del email no es válido';
    }
    if (formData.telefono && !validatePhoneNumber(formData.telefono)) {
      errors.telefono = 'El formato del teléfono no es válido';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      Logger.warn('Validación de formulario fallida', { errors });
      return;
    }

    setFormErrors({});
    Logger.info(editingCoord ? 'Actualizando coordinador' : 'Creando coordinador', { nombre: formData.nombre });

    if (editingCoord) {
      updateMutation.mutate({ id: editingCoord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <UserCog className="w-8 h-8 text-[#1e3a5f]" />
                Coordinadores
              </h1>
              <p className="text-slate-500 mt-1">
                Gestiona los coordinadores y sus preferencias de notificación
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <NotificacionesMasivas />
              <Button 
                onClick={() => setMostrarRecordatorios(!mostrarRecordatorios)}
                variant={mostrarRecordatorios ? "default" : "outline"}
                className={mostrarRecordatorios ? "bg-[#1e3a5f] hover:bg-[#152a45] text-white" : ""}
              >
                <Clock className="w-4 h-4 mr-2" />
                Recordatorios Automáticos
              </Button>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-[#1e3a5f] hover:bg-[#152a45] text-white shadow-lg shadow-[#1e3a5f]/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir Coordinador
              </Button>
            </div>
          </div>
        </div>

        {/* Configuración de Recordatorios */}
        {mostrarRecordatorios && (
          <div className="mb-8">
            <ConfiguracionRecordatorios />
          </div>
        )}

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-6 mb-8 bg-white shadow-xl border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-slate-800">
                    {editingCoord ? 'Editar Coordinador' : 'Nuevo Coordinador'}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código</Label>
                      <Input
                        id="codigo"
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                        placeholder="C001"
                        className={formErrors.codigo ? 'border-red-500' : formData.codigo.trim() ? 'border-emerald-500' : ''}
                      />
                      {formErrors.codigo && <p className="text-xs text-red-500">{formErrors.codigo}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Nombre del coordinador"
                        className={formErrors.nombre ? 'border-red-500' : formData.nombre.trim() ? 'border-emerald-500' : ''}
                      />
                      {formErrors.nombre && <p className="text-xs text-red-500">{formErrors.nombre}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@ejemplo.com"
                        className={formErrors.email ? 'border-red-500' : formData.email && validateEmail(formData.email) ? 'border-emerald-500' : ''}
                      />
                      {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="+34 600 000 000"
                        className={formErrors.telefono ? 'border-red-500' : formData.telefono && validatePhoneNumber(formData.telefono) ? 'border-emerald-500' : ''}
                      />
                      {formErrors.telefono && <p className="text-xs text-red-500">{formErrors.telefono}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="notif_email"
                        checked={formData.notificaciones_email}
                        onCheckedChange={(v) => setFormData({ ...formData, notificaciones_email: v })}
                      />
                      <Label htmlFor="notif_email" className="flex items-center gap-2 cursor-pointer">
                        <Mail className="w-4 h-4 text-slate-500" />
                        Notificaciones por Email
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="notif_app"
                        checked={formData.notificaciones_app}
                        onCheckedChange={(v) => setFormData({ ...formData, notificaciones_app: v })}
                      />
                      <Label htmlFor="notif_app" className="flex items-center gap-2 cursor-pointer">
                        <Bell className="w-4 h-4 text-slate-500" />
                        Notificaciones In-App
                      </Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
                      {editingCoord ? 'Guardar Cambios' : 'Añadir Coordinador'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <Card className="bg-white shadow-lg border-slate-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-semibold text-slate-700">Código</TableHead>
                <TableHead className="font-semibold text-slate-700">Nombre</TableHead>
                <TableHead className="font-semibold text-slate-700">Email</TableHead>
                <TableHead className="font-semibold text-slate-700">Teléfono</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">Email</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">In-App</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3a5f]"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : coordinadores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No hay coordinadores registrados
                  </TableCell>
                </TableRow>
              ) : (
                coordinadores.map((coord) => (
                  <TableRow key={coord.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-sm font-semibold text-[#1e3a5f]">{coord.codigo}</TableCell>
                    <TableCell className="font-medium text-slate-800">{coord.nombre}</TableCell>
                    <TableCell className="text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        {coord.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {coord.telefono && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          {coord.telefono}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {coord.notificaciones_email ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
                          <Mail className="w-3 h-3 text-emerald-600" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100">
                          <Mail className="w-3 h-3 text-slate-400" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {coord.notificaciones_app ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
                          <Bell className="w-3 h-3 text-emerald-600" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100">
                          <Bell className="w-3 h-3 text-slate-400" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEdit(coord)}
                          className="h-8 w-8 text-slate-500 hover:text-[#1e3a5f]"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar coordinador?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará el coordinador <strong>{coord.nombre}</strong>. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(coord.id)}
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
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}