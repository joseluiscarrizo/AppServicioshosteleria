import { useRole } from '@/contexts/RoleContext';

export const UserDashboard = () => {
  const { currentUser } = useRole();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Mi Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Mis Eventos</h3>
          <p className="text-3xl font-bold text-blue-600">--</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Horas Trabajadas</h3>
          <p className="text-3xl font-bold text-green-600">-- hrs</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Próximo Evento</h3>
          <p className="text-sm text-gray-600">Sin asignaciones</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Mi Perfil</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <p className="text-gray-900">{currentUser?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="text-gray-900">{currentUser?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <p className="text-gray-900">{currentUser?.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
