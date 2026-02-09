import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Mail, Volume2, Vibrate, MessageSquare, Calendar, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';

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
        </div>
      </div>
    </div>
  );
}