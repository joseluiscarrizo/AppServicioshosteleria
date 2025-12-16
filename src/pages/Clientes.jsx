import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Pencil, Mail, Phone, Building, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Clientes() {
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    email_1: '',
    email_2: '',
    telefono_1: '',
    telefono_2: '',
    persona_contacto_1: '',
    persona_contacto_2: '',
    notas: '',
    activo: true
  });

  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nombre')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowForm(false);
      resetForm();
      toast.success('Cliente creado');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowForm(false);
      resetForm();
      toast.success('Cliente actualizado');
    }
  });

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      email_1: '',
      email_2: '',
      telefono_1: '',
      telefono_2: '',
      persona_contacto_1: '',
      persona_contacto_2: '',
      notas: '',
      activo: true
    });
    setEditingCliente(null);
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData(cliente);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let dataToSubmit = { ...formData };
    
    // Generar código automático si es nuevo cliente
    if (!editingCliente) {
      const maxCodigo = clientes.reduce((max, c) => {
        if (c.codigo && c.codigo.startsWith('CL')) {
          const num = parseInt(c.codigo.substring(2));
          return Math.max(max, isNaN(num) ? 0 : num);
        }
        return max;
      }, 0);
      dataToSubmit.codigo = `CL${String(maxCodigo + 1).padStart(3, '0')}`;
    }
    
    if (editingCliente) {
      await updateMutation.mutateAsync({ id: editingCliente.id, data: dataToSubmit });
    } else {
      await createMutation.mutateAsync(dataToSubmit);
    }
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email_1?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email_2?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono_1?.includes(busqueda) ||
    c.telefono_2?.includes(busqueda)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Users className="w-8 h-8 text-[#1e3a5f]" />
              Gestión de Clientes
            </h1>
            <p className="text-slate-500 mt-1">Administra la base de datos de clientes</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-[#1e3a5f] hover:bg-[#152a45]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">Total Clientes</p>
            <p className="text-2xl font-bold text-slate-800">{clientes.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Clientes Activos</p>
            <p className="text-2xl font-bold text-emerald-600">
              {clientes.filter(c => c.activo).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-500">Clientes Inactivos</p>
            <p className="text-2xl font-bold text-slate-400">
              {clientes.filter(c => !c.activo).length}
            </p>
          </Card>
        </div>

        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por código, nombre, email o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesFiltrados.map(cliente => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <span className="font-mono font-semibold text-[#1e3a5f]">
                      {cliente.codigo || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-800">{cliente.nombre}</p>
                      {cliente.notas && (
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">
                          {cliente.notas}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{cliente.email_1 || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{cliente.telefono_1 || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{cliente.persona_contacto_1 || '-'}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cliente.activo 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-slate-100 text-slate-600'
                    }>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(cliente)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {clientesFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Código Automático */}
              {!editingCliente && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-xs text-slate-500">Código Automático del Cliente</Label>
                  <p className="font-mono font-semibold text-lg text-[#1e3a5f]">
                    {(() => {
                      const maxCodigo = clientes.reduce((max, c) => {
                        if (c.codigo && c.codigo.startsWith('CL')) {
                          const num = parseInt(c.codigo.substring(2));
                          return Math.max(max, num);
                        }
                        return max;
                      }, 0);
                      return `CL${String(maxCodigo + 1).padStart(3, '0')}`;
                    })()}
                  </p>
                </div>
              )}

              {editingCliente && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-xs text-slate-500">Código del Cliente</Label>
                  <p className="font-mono font-semibold text-lg text-[#1e3a5f]">
                    {formData.codigo}
                  </p>
                </div>
              )}

              {/* Nombre del Cliente */}
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Cliente *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              {/* Emails */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email_1">Mail 1</Label>
                  <Input
                    id="email_1"
                    type="email"
                    value={formData.email_1}
                    onChange={(e) => setFormData({ ...formData, email_1: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_2">Mail 2</Label>
                  <Input
                    id="email_2"
                    type="email"
                    value={formData.email_2}
                    onChange={(e) => setFormData({ ...formData, email_2: e.target.value })}
                  />
                </div>
              </div>

              {/* Teléfonos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono_1">Teléfono 1</Label>
                  <Input
                    id="telefono_1"
                    value={formData.telefono_1}
                    onChange={(e) => setFormData({ ...formData, telefono_1: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono_2">Teléfono 2</Label>
                  <Input
                    id="telefono_2"
                    value={formData.telefono_2}
                    onChange={(e) => setFormData({ ...formData, telefono_2: e.target.value })}
                  />
                </div>
              </div>

              {/* Personas de Contacto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="persona_contacto_1">Persona de Contacto 1</Label>
                  <Input
                    id="persona_contacto_1"
                    value={formData.persona_contacto_1}
                    onChange={(e) => setFormData({ ...formData, persona_contacto_1: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="persona_contacto_2">Persona de Contacto 2</Label>
                  <Input
                    id="persona_contacto_2"
                    value={formData.persona_contacto_2}
                    onChange={(e) => setFormData({ ...formData, persona_contacto_2: e.target.value })}
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">
                  {editingCliente ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}