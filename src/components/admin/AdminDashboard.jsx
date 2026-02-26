import { useRole } from '@/contexts/RoleContext';

export const AdminDashboard = () => {
  const { isAdminLevel1 } = useRole();

  if (!isAdminLevel1) {
    return <div>Acceso denegado</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Admin Level 1 - Panel de Control</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Usuarios Totales</h3>
          <p className="text-3xl font-bold text-blue-600">--</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Admins Level 2</h3>
          <p className="text-3xl font-bold text-purple-600">--</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Eventos Activos</h3>
          <p className="text-3xl font-bold text-green-600">--</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Reportes</h3>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Ver Todos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Gestionar Usuarios</h2>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              + Crear Usuario
            </button>
            <button className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
              + Crear Admin Level 2
            </button>
            <button className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Ver Todos los Usuarios
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Configuración del Sistema</h2>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Configurar Parámetros
            </button>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Ver Logs del Sistema
            </button>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Backup & Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
