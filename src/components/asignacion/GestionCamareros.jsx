import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const especialidades = [
  { value: 'general', label: 'General' },
  { value: 'cocteleria', label: 'Coctelería' },
  { value: 'banquetes', label: 'Banquetes' },
  { value: 'eventos_vip', label: 'Eventos VIP' },
  { value: 'buffet', label: 'Buffet' }
];

export default function GestionCamareros({ open, onOpenChange, editingCamarero }) {
  const [formData, setFormData] = useState(editingCamarero || {
    codigo: '',
    nombre: '',
    telefono: '',
    email: '',
    disponible: true,
    tallas_camisa: '',
    especialidad: 'general',
    notas: ''
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (editingCamarero) {
      setFormData(editingCamarero);
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        telefono: '',
        email: '',
        disponible: true,
        tallas_camisa: '',
        especialidad: 'general',
        notas: ''
      });
    }
  }, [editingCamarero, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Camarero.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      onOpenChange(false);
      toast.success('Camarero añadido');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Camarero.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camareros'] });
      onOpenChange(false);
      toast.success('Camarero actualizado');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCamarero) {
      updateMutation.mutate({ id: editingCamarero.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingCamarero ? 'Editar Camarero' : 'Nuevo Camarero'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="CAM001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre completo"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="especialidad">Especialidad</Label>
              <Select 
                value={formData.especialidad} 
                onValueChange={(v) => setFormData({ ...formData, especialidad: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {especialidades.map(e => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tallas">Talla Camisa</Label>
              <Input
                id="tallas"
                value={formData.tallas_camisa}
                onChange={(e) => setFormData({ ...formData, tallas_camisa: e.target.value })}
                placeholder="M, L, XL..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="disponible"
              checked={formData.disponible}
              onCheckedChange={(v) => setFormData({ ...formData, disponible: v })}
            />
            <Label htmlFor="disponible" className="cursor-pointer">
              Disponible para asignaciones
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45] text-white">
              {editingCamarero ? 'Guardar Cambios' : 'Añadir Camarero'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}