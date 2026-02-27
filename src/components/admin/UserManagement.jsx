import { useState } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { usePermission } from '@/hooks/usePermission';

export const UserManagement = () => {
  const { isAdminLevel1, isAdminLevel2: _isAdminLevel2 } = useRole();
  const { can } = usePermission();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    role: 'USER'
  });

  const canCreateUsers = can('CREATE', 'users');
  const canCreateAdmins = isAdminLevel1;

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!canCreateUsers) {
      alert('No tienes permiso para crear usuarios');
      return;
    }

    // Validate role selection
    if (formData.role === 'ADMIN_LEVEL_2' && !canCreateAdmins) {
      alert('Solo Admin Level 1 puede crear Admins Level 2');
      return;
    }

    try {
      // Create user via Cloud Function
      const response = await fetch('/.netlify/functions/createUser', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Usuario creado exitosamente');
        setFormData({ email: '', name: '', phone: '', role: 'USER' });
        setShowCreateForm(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error al crear usuario: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error al crear usuario');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Gestión de Usuarios</h2>

      {canCreateUsers && (
        <>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Crear Nuevo Usuario
          </button>

          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="mb-6 p-4 border rounded-lg">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-3 py-2 border rounded"
                  required
                />
                <input
                  type="text"
                  placeholder="Nombre"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 border rounded"
                  required
                />
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="px-3 py-2 border rounded"
                >
                  <option value="USER">Usuario Normal</option>
                  {isAdminLevel1 && <option value="ADMIN_LEVEL_2">Admin Level 2</option>}
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Crear Usuario
              </button>
            </form>
          )}
        </>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Nombre</th>
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Rol</th>
              <th className="text-left py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* Map users here */}
          </tbody>
        </table>
      </div>
    </div>
  );
};
