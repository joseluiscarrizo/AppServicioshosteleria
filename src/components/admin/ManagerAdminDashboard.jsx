import { useRole } from '@/contexts/RoleContext';

export const ManagerAdminDashboard = () => {
  const { isAdminLevel2 } = useRole();

  if (!isAdminLevel2) {
    return <div>Acceso denegado</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Admin Level 2 - Panel de Gestión</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Mi Personal</h3>
          <p className="text-3xl font-bold text-blue-600">--</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Eventos Asignados</h3>
          <p className="text-3xl font-bold text-green-600">--</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Reportes Activos</h3>
          <p className="text-3xl font-bold text-orange-600">--</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Gestionar Personal</h2>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              + Agregar Camarero
            </button>
            <button className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Ver Mi Personal
            </button>
            <button className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Asignar a Eventos
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Comunicaciones</h2>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Enviar WhatsApp Masivo
            </button>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Notificar Personal
            </button>
            <button className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Ver Historial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
