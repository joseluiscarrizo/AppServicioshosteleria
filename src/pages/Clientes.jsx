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
    nombre: '',
    email_principal: '',
    email_secundario: '',
    email_terciario: '',
    telefono: '',
    telefono_secundario: '',
    empresa: '',
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
      nombre: '',
      email_principal: '',
      email_secundario: '',
      email_terciario: '',
      telefono: '',
      telefono_secundario: '',
      empresa: '',
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email_principal?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.empresa?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda)
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
              placeholder="Buscar por nombre, email, empresa o teléfono..."
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
                <TableHead>Cliente</TableHead>
                <TableHead>Email Principal</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesFiltrados.map(cliente => (
                <TableRow key={cliente.id}>
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
                      <span className="text-sm">{cliente.email_principal || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{cliente.telefono || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {cliente.empresa && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{cliente.empresa}</span>
                      </div>
                    )}
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
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa">Empresa</Label>
                  <Input
                    id="empresa"
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_principal">Email Principal</Label>
                <Input
                  id="email_principal"
                  type="email"
                  value={formData.email_principal}
                  onChange={(e) => setFormData({ ...formData, email_principal: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email_secundario">Email Secundario</Label>
                  <Input
                    id="email_secundario"
                    type="email"
                    value={formData.email_secundario}
                    onChange={(e) => setFormData({ ...formData, email_secundario: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_terciario">Email Terciario</Label>
                  <Input
                    id="email_terciario"
                    type="email"
                    value={formData.email_terciario}
                    onChange={(e) => setFormData({ ...formData, email_terciario: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono Principal (WhatsApp)</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono_secundario">Teléfono Secundario</Label>
                  <Input
                    id="telefono_secundario"
                    value={formData.telefono_secundario}
                    onChange={(e) => setFormData({ ...formData, telefono_secundario: e.target.value })}
                  />
                </div>
              </div>

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