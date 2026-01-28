import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Volume2, VolumeX, Vibrate, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWebPushNotifications } from '../components/notificaciones/WebPushService';

export default function PreferenciasNotificaciones() {
  const [user, setUser] = useState(null);
  const [testingNotification, setTestingNotification] = useState(false);
  const queryClient = useQueryClient();
  const { isAllowed, requestPermission, showNotification } = useWebPushNotifications();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: preferencias, isLoading } = useQuery({
    queryKey: ['preferencias-notificacion', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const prefs = await base44.entities.PreferenciasNotificacion.filter({ user_id: user.id });
      return prefs[0] || null;
    },
    enabled: !!user?.id
  });

  const crearMutation = useMutation({
    mutationFn: (data) => base44.entities.PreferenciasNotificacion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferencias-notificacion'] });
      toast.success('Preferencias guardadas');
    }
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PreferenciasNotificacion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferencias-notificacion'] });
      toast.success('Preferencias actualizadas');
    }
  });

  const handleToggle = async (campo, valor) => {
    if (!user?.id) return;

    const datos = { ...preferencias, [campo]: valor, user_id: user.id };

    if (preferencias?.id) {
      actualizarMutation.mutate({ id: preferencias.id, data: { [campo]: valor } });
    } else {
      crearMutation.mutate(datos);
    }
  };

  const handleHabilitarPush = async () => {
    if (!isAllowed) {
      const granted = await requestPermission();
      if (granted) {
        handleToggle('push_habilitadas', true);
        toast.success('¡Notificaciones habilitadas! Ahora recibirás alertas en tiempo real.');
      }
    } else {
      handleToggle('push_habilitadas', !preferencias?.push_habilitadas);
    }
  };

  const testNotification = async () => {
    setTestingNotification(true);
    try {
      if (isAllowed && showNotification) {
        showNotification(
          '🔔 Prueba de Notificación',
          'Si ves esto, ¡las notificaciones funcionan correctamente!',
          '/icon.png'
        );
      }
      
      if (preferencias?.sonido_habilitado) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTWN2e/IdCQEKXbF8NaLOwsVXLDq7a1OFQpJnuLswm4fBDGK2PCxcCoFKm/A7dSTQQsUW7bq66hVFApGn+DyvmwhBTWN2e/IdCQEKXbF8NaLOwsVXLDq7a1OFQpJnuLswm4fBDGK2PCxcCo=');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }

      toast.success('Notificación de prueba enviada');
    } catch (error) {
      toast.error('Error al enviar notificación de prueba');
    } finally {
      setTestingNotification(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Bell className="w-8 h-8 text-[#1e3a5f]" />
            Preferencias de Notificaciones
          </h1>
          <p className="text-slate-500 mt-2">Personaliza cómo y cuándo quieres recibir alertas</p>
        </div>

        {/* Estado de Notificaciones Push */}
        <Card className={`border-2 ${isAllowed && preferencias?.push_habilitadas ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isAllowed && preferencias?.push_habilitadas ? (
                  <Bell className="w-6 h-6 text-green-600" />
                ) : (
                  <BellOff className="w-6 h-6 text-slate-400" />
                )}
                <div>
                  <CardTitle>Notificaciones Push</CardTitle>
                  <CardDescription>
                    {isAllowed && preferencias?.push_habilitadas
                      ? '✓ Activas - Recibirás alertas en tiempo real'
                      : 'Desactivadas - No recibirás alertas push'}
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={handleHabilitarPush}
                variant={isAllowed && preferencias?.push_habilitadas ? 'outline' : 'default'}
                className={!isAllowed || !preferencias?.push_habilitadas ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {isAllowed && preferencias?.push_habilitadas ? 'Desactivar' : 'Activar Ahora'}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Tipos de Notificaciones */}
        {isLoading ? (
          <Card className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Notificaciones</CardTitle>
              <CardDescription>Selecciona qué eventos quieres que te notifiquen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  <div>
                    <Label className="font-medium">Nuevas Asignaciones</Label>
                    <p className="text-sm text-slate-500">Cuando te asignen a un nuevo evento</p>
                  </div>
                </div>
                <Switch
                  checked={preferencias?.nuevas_asignaciones ?? true}
                  onCheckedChange={(v) => handleToggle('nuevas_asignaciones', v)}
                  disabled={!preferencias?.push_habilitadas && preferencias !== null}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orange-500" />
                  <div>
                    <Label className="font-medium">Cambios de Horario</Label>
                    <p className="text-sm text-slate-500">Modificaciones en fecha u hora de eventos</p>
                  </div>
                </div>
                <Switch
                  checked={preferencias?.cambios_horario ?? true}
                  onCheckedChange={(v) => handleToggle('cambios_horario', v)}
                  disabled={!preferencias?.push_habilitadas && preferencias !== null}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-red-500" />
                  <div>
                    <Label className="font-medium">Cancelaciones</Label>
                    <p className="text-sm text-slate-500">Cuando se cancele un evento asignado</p>
                  </div>
                </div>
                <Switch
                  checked={preferencias?.cancelaciones ?? true}
                  onCheckedChange={(v) => handleToggle('cancelaciones', v)}
                  disabled={!preferencias?.push_habilitadas && preferencias !== null}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-500" />
                  <div>
                    <Label className="font-medium">Recordatorios</Label>
                    <p className="text-sm text-slate-500">Recordatorios antes de tus eventos</p>
                  </div>
                </div>
                <Switch
                  checked={preferencias?.recordatorios ?? true}
                  onCheckedChange={(v) => handleToggle('recordatorios', v)}
                  disabled={!preferencias?.push_habilitadas && preferencias !== null}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <Label className="font-medium">Mensajes del Coordinador</Label>
                    <p className="text-sm text-slate-500">Comunicaciones importantes</p>
                  </div>
                </div>
                <Switch
                  checked={preferencias?.mensajes_coordinador ?? true}
                  onCheckedChange={(v) => handleToggle('mensajes_coordinador', v)}
                  disabled={!preferencias?.push_habilitadas && preferencias !== null}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-500" />
                  <div>
                    <Label className="font-medium">Tareas Pendientes</Label>
                    <p className="text-sm text-slate-500">Recordatorios de tareas por completar</p>
                  </div>
                </div>
                <Switch
                  checked={preferencias?.tareas_pendientes ?? true}
                  onCheckedChange={(v) => handleToggle('tareas_pendientes', v)}
                  disabled={!preferencias?.push_habilitadas && preferencias !== null}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuración de Sonido y Vibración */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas y Sonidos</CardTitle>
            <CardDescription>Personaliza cómo te alertan las notificaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                {preferencias?.sonido_habilitado ? (
                  <Volume2 className="w-5 h-5 text-[#1e3a5f]" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <Label className="font-medium">Sonido</Label>
                  <p className="text-sm text-slate-500">Reproducir sonido al recibir notificación</p>
                </div>
              </div>
              <Switch
                checked={preferencias?.sonido_habilitado ?? true}
                onCheckedChange={(v) => handleToggle('sonido_habilitado', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Vibrate className="w-5 h-5 text-[#1e3a5f]" />
                <div>
                  <Label className="font-medium">Vibración</Label>
                  <p className="text-sm text-slate-500">Vibrar al recibir notificación (móvil)</p>
                </div>
              </div>
              <Switch
                checked={preferencias?.vibrar_habilitado ?? true}
                onCheckedChange={(v) => handleToggle('vibrar_habilitado', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#1e3a5f]" />
                <div>
                  <Label className="font-medium">Notificaciones por Email</Label>
                  <p className="text-sm text-slate-500">Recibir copia por correo electrónico</p>
                </div>
              </div>
              <Switch
                checked={preferencias?.email_habilitado ?? false}
                onCheckedChange={(v) => handleToggle('email_habilitado', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Probar Notificación */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Probar Notificación</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Envía una notificación de prueba para verificar tu configuración
                </p>
              </div>
              <Button
                onClick={testNotification}
                disabled={!isAllowed || testingNotification}
                variant="outline"
                className="bg-white"
              >
                {testingNotification ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Enviar Prueba
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Información */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">
              💡 <strong>Tip:</strong> Las notificaciones push funcionan incluso cuando la app está cerrada.
              Asegúrate de tener las notificaciones habilitadas en la configuración de tu navegador o dispositivo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}