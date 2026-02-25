import { useState } from 'react';
import { Settings, User, Bell, Shield, Trash2, ChevronRight, LogOut, Moon, Globe, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export default function ConfiguracionCuenta() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleted, setDeleted] = useState(false);

  function handleDeleteAccount() {
    if (deleteConfirm.toLowerCase() !== 'eliminar') return;
    // Aquí iría la llamada real a la API para eliminar la cuenta
    setDeleted(true);
    setShowDeleteModal(false);
  }

  if (deleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Solicitud enviada</h2>
          <p className="text-slate-500 text-sm">
            Tu solicitud de eliminación de cuenta ha sido registrada. Recibirás un email de confirmación en las próximas 24 horas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header móvil con back button */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 md:hidden">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] flex items-center justify-center">
          <Settings className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">Ajustes</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5">

        {/* Perfil */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cuenta</p>
          </div>
          <div className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] flex items-center justify-center text-white text-xl font-bold">
              C
            </div>
            <div>
              <p className="font-semibold text-slate-800">Coordinador</p>
              <p className="text-sm text-slate-500">info@staffcoordinator.es</p>
              <span className="inline-block mt-1 text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] font-medium px-2 py-0.5 rounded-full">
                Plan Professional
              </span>
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notificaciones</p>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Notificaciones push</p>
                  <p className="text-xs text-slate-400">Alertas en tiempo real</p>
                </div>
              </div>
              <Switch checked={notifPush} onCheckedChange={setNotifPush} />
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Notificaciones por email</p>
                  <p className="text-xs text-slate-400">Resumen diario y alertas urgentes</p>
                </div>
              </div>
              <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
            </div>
          </div>
        </div>

        {/* Apariencia */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Apariencia</p>
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <Moon className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Modo oscuro</p>
                <p className="text-xs text-slate-400">Sincronizado con el sistema</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
        </div>

        {/* Seguridad */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Seguridad y privacidad</p>
          </div>
          <div className="divide-y divide-slate-100">
            <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-slate-700">Cambiar contraseña</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-slate-700">Política de privacidad</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Sesión */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sesión</p>
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">Cerrar sesión</p>
          </button>
        </div>

        {/* ── ZONA PELIGROSA: Eliminar cuenta ── (Requerido App Store / Google Play) */}
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Zona peligrosa</p>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Eliminar cuenta</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta acción es irreversible. Se eliminarán todos tus datos, pedidos, camareros y configuraciones de forma permanente.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Solicitar eliminación de cuenta
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          Staff Coordinator v1.0  ·  © 2026
        </p>
      </div>

      {/* Modal confirmación eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">¿Eliminar cuenta?</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Esta acción <strong>no se puede deshacer</strong>. Se eliminarán permanentemente todos tus datos.
              </p>
              <p className="text-sm text-slate-600 mb-3">
                Escribí <strong className="text-red-600">eliminar</strong> para confirmar:
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="eliminar"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-red-400"
                style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleteConfirm.toLowerCase() !== 'eliminar'}
                  onClick={handleDeleteAccount}
                >
                  Eliminar cuenta
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
