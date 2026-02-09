import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellOff, Mail, Volume2, Vibrate, MessageSquare, Calendar, Users, Clock, Moon, History } from 'lucide-react';
import { toast } from 'sonner';
import HistorialNotificaciones from '../components/notificaciones/HistorialNotificaciones';

export default function PreferenciasNotificaciones() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch {
        // Handle error silently
      }
    };
    fetchUser();
  }, []);

  const { data: preferencias, isLoading } = useQuery({
    queryKey: ['preferencias', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const prefs = await base44.entities.PreferenciasNotificacion.filter({ user_id: user.id });
      return prefs[0] || null;
    },
    enabled: !!user?.id
  });

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      if (preferencias?.id) {
        return await base44.entities.PreferenciasNotificacion.update(preferencias.id, updates);
      } else {
        return await base44.entities.PreferenciasNotificacion.create({
          user_id: user.id,
          ...updates
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferencias'] });
      toast.success('Preferencias actualizadas');
    }
  });

  const handleToggle = (field) => {
    const currentValue = preferencias?.[field] ?? true;
    updateMutation.mutate({ [field]: !currentValue });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Cargando preferencias...</div>
      </div>
    );
  }

  const prefs = preferencias || {};

  const diasSemana = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' }
  ];

  const toggleDia = (dia) => {
    const dias = prefs.no_molestar_dias || [0, 1, 2, 3, 4, 5, 6];
    const newDias = dias.includes(dia) 
      ? dias.filter(d => d !== dia)
      : [...dias, dia];
    handleToggle('no_molestar_dias', newDias);
  };

  const handleToggleDirect = (field, value) => {
    updateMutation.mutate({ [field]: value });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Preferencias de Notificaciones</h1>
          <p className="text-slate-600">Configura cómo y cuándo quieres recibir notificaciones</p>
        </div>

        <div className="space-y-6">
          {/* Notificaciones Push */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#1e3a5f]" />
                Notificaciones Push
              </CardTitle>
              <CardDescription>
                Recibe notificaciones en tiempo real en tu navegador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="push_habilitadas">Habilitar notificaciones push</Label>
                </div>
                <Switch
                  id="push_habilitadas"
                  checked={prefs.push_habilitadas ?? true}
                  onCheckedChange={() => handleToggle('push_habilitadas')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tipos de Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#1e3a5f]" />
                Tipos de Notificaciones
              </CardTitle>
              <CardDescription>
                Selecciona qué eventos quieres que te notifiquen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="nuevas_asignaciones">Nuevas asignaciones</Label>
                </div>
                <Switch
                  id="nuevas_asignaciones"
                  checked={prefs.nuevas_asignaciones ?? true}
                  onCheckedChange={() => handleToggle('nuevas_asignaciones')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="cambios_horario">Cambios de horario</Label>
                </div>
                <Switch
                  id="cambios_horario"
                  checked={prefs.cambios_horario ?? true}
                  onCheckedChange={() => handleToggle('cambios_horario')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BellOff className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="cancelaciones">Cancelaciones</Label>
                </div>
                <Switch
                  id="cancelaciones"
                  checked={prefs.cancelaciones ?? true}
                  onCheckedChange={() => handleToggle('cancelaciones')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="recordatorios">Recordatorios automáticos</Label>
                </div>
                <Switch
                  id="recordatorios"
                  checked={prefs.recordatorios ?? true}
                  onCheckedChange={() => handleToggle('recordatorios')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="mensajes_coordinador">Mensajes del coordinador</Label>
                </div>
                <Switch
                  id="mensajes_coordinador"
                  checked={prefs.mensajes_coordinador ?? true}
                  onCheckedChange={() => handleToggle('mensajes_coordinador')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="tareas_pendientes">Tareas pendientes</Label>
                </div>
                <Switch
                  id="tareas_pendientes"
                  checked={prefs.tareas_pendientes ?? true}
                  onCheckedChange={() => handleToggle('tareas_pendientes')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Canales de Notificación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#1e3a5f]" />
                Canales de Notificación
              </CardTitle>
              <CardDescription>
                Elige cómo quieres recibir las notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="email_habilitado">Notificaciones por email</Label>
                </div>
                <Switch
                  id="email_habilitado"
                  checked={prefs.email_habilitado ?? false}
                  onCheckedChange={() => handleToggle('email_habilitado')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="sonido_habilitado">Reproducir sonido</Label>
                </div>
                <Switch
                  id="sonido_habilitado"
                  checked={prefs.sonido_habilitado ?? true}
                  onCheckedChange={() => handleToggle('sonido_habilitado')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Vibrate className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="vibrar_habilitado">Vibración</Label>
                </div>
                <Switch
                  id="vibrar_habilitado"
                  checked={prefs.vibrar_habilitado ?? true}
                  onCheckedChange={() => handleToggle('vibrar_habilitado')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sonidos Personalizables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-[#1e3a5f]" />
                Sonidos de Notificación
              </CardTitle>
              <CardDescription>
                Personaliza el sonido de tus notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tipo_sonido">Tipo de Sonido</Label>
                <Select 
                  value={prefs.tipo_sonido || 'default'} 
                  onValueChange={(v) => handleToggleDirect('tipo_sonido', v)}
                >
                  <SelectTrigger id="tipo_sonido">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Predeterminado</SelectItem>
                    <SelectItem value="suave">Suave</SelectItem>
                    <SelectItem value="alerta">Alerta</SelectItem>
                    <SelectItem value="campana">Campana</SelectItem>
                    <SelectItem value="silencioso">Silencioso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="volumen">Volumen: {Math.round((prefs.volumen_sonido ?? 0.5) * 100)}%</Label>
                <Input
                  id="volumen"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={prefs.volumen_sonido ?? 0.5}
                  onChange={(e) => handleToggleDirect('volumen_sonido', parseFloat(e.target.value))}
                  className="cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Modo No Molestar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-[#1e3a5f]" />
                Modo No Molestar
              </CardTitle>
              <CardDescription>
                Silencia notificaciones en horarios específicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-slate-600" />
                  <Label htmlFor="no_molestar">Habilitar No Molestar</Label>
                </div>
                <Switch
                  id="no_molestar"
                  checked={prefs.no_molestar_habilitado ?? false}
                  onCheckedChange={() => handleToggle('no_molestar_habilitado')}
                />
              </div>

              {prefs.no_molestar_habilitado && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hora_inicio">Hora de Inicio</Label>
                      <Input
                        id="hora_inicio"
                        type="time"
                        value={prefs.no_molestar_inicio || '22:00'}
                        onChange={(e) => handleToggleDirect('no_molestar_inicio', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hora_fin">Hora de Fin</Label>
                      <Input
                        id="hora_fin"
                        type="time"
                        value={prefs.no_molestar_fin || '08:00'}
                        onChange={(e) => handleToggleDirect('no_molestar_fin', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Días Activos</Label>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {diasSemana.map(dia => (
                        <Button
                          key={dia.value}
                          type="button"
                          variant={(prefs.no_molestar_dias || [0,1,2,3,4,5,6]).includes(dia.value) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleDia(dia.value)}
                          className={
                            (prefs.no_molestar_dias || [0,1,2,3,4,5,6]).includes(dia.value)
                              ? 'bg-[#1e3a5f]'
                              : ''
                          }
                        >
                          {dia.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-amber-500" />
                      <Label htmlFor="permitir_urgentes">Permitir notificaciones urgentes</Label>
                    </div>
                    <Switch
                      id="permitir_urgentes"
                      checked={prefs.permitir_urgentes_no_molestar ?? true}
                      onCheckedChange={() => handleToggle('permitir_urgentes_no_molestar')}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Historial de Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#1e3a5f]" />
                Historial de Notificaciones
              </CardTitle>
              <CardDescription>
                Revisa todas tus notificaciones recientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HistorialNotificaciones />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}