import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import HabilidadesEditor from '../camareros/HabilidadesEditor';

const especialidades = [
  { value: 'general', label: 'General' },
  { value: 'cocteleria', label: 'Coctelería' },
  { value: 'banquetes', label: 'Banquetes' },
  { value: 'eventos_vip', label: 'Eventos VIP' },
  { value: 'buffet', label: 'Buffet' }
];

export default function GestionCamareros({ open, onOpenChange, editingCamarero }) {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    telefono: '',
    email: '',
    disponible: true,
    tallas_camisa: '',
    especialidad: 'general',
    habilidades: [],
    idiomas: [],
    certificaciones: [],
    experiencia_anios: 0,
    notas: '',
    coordinador_id: ''
  });

  const queryClient = useQueryClient();

  const { data: coordinadores = [] } = useQuery({
    queryKey: ['coordinadores'],
    queryFn: () => base44.entities.Coordinador.list('nombre')
  });

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('codigo')
  });

  React.useEffect(() => {
    if (editingCamarero) {
      setFormData({
        ...editingCamarero,
        habilidades: editingCamarero.habilidades || [],
        idiomas: editingCamarero.idiomas || [],
        certificaciones: editingCamarero.certificaciones || [],
        coordinador_id: editingCamarero.coordinador_id || ''
      });
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        telefono: '',
        email: '',
        disponible: true,
        tallas_camisa: '',
        especialidad: 'general',
        habilidades: [],
        idiomas: [],
        certificaciones: [],
        experiencia_anios: 0,
        notas: '',
        coordinador_id: ''
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
    
    let dataToSubmit = { ...formData };
    
    // Generar código automático si es nuevo camarero
    if (!editingCamarero) {
      const maxCodigo = camareros.reduce((max, c) => {
        if (c.codigo && c.codigo.startsWith('CAM')) {
          const num = parseInt(c.codigo.substring(3));
          return Math.max(max, isNaN(num) ? 0 : num);
        }
        return max;
      }, 0);
      dataToSubmit.codigo = `CAM${String(maxCodigo + 1).padStart(3, '0')}`;
    }
    
    if (editingCamarero) {
      updateMutation.mutate({ id: editingCamarero.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingCamarero ? 'Editar Camarero' : 'Nuevo Camarero'}
            {editingCamarero?.valoracion_promedio > 0 && (
              <span className="flex items-center gap-1 text-sm font-normal text-amber-600">
                <Star className="w-4 h-4 fill-amber-400" />
                {editingCamarero.valoracion_promedio.toFixed(1)}
                <span className="text-slate-400">({editingCamarero.total_valoraciones})</span>
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="info">Información Básica</TabsTrigger>
              <TabsTrigger value="skills">Habilidades</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              {/* Código automático */}
              {!editingCamarero && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-xs text-slate-500">Código Automático del Camarero</Label>
                  <p className="font-mono font-semibold text-lg text-[#1e3a5f]">
                    {(() => {
                      const maxCodigo = camareros.reduce((max, c) => {
                        if (c.codigo && c.codigo.startsWith('CAM')) {
                          const num = parseInt(c.codigo.substring(3));
                          return Math.max(max, isNaN(num) ? 0 : num);
                        }
                        return max;
                      }, 0);
                      return `CAM${String(maxCodigo + 1).padStart(3, '0')}`;
                    })()}
                  </p>
                </div>
              )}

              {editingCamarero && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-xs text-slate-500">Código del Camarero</Label>
                  <p className="font-mono font-semibold text-lg text-[#1e3a5f]">
                    {formData.codigo}
                  </p>
                </div>
              )}

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

              <div className="grid grid-cols-3 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="experiencia">Años Experiencia</Label>
                  <Input
                    id="experiencia"
                    type="number"
                    min="0"
                    value={formData.experiencia_anios || ''}
                    onChange={(e) => setFormData({ ...formData, experiencia_anios: parseInt(e.target.value) || 0 })}
                    placeholder="0"
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
                <Label htmlFor="coordinador">Coordinador Asignado</Label>
                <Select
                  value={formData.coordinador_id}
                  onValueChange={(value) => setFormData({ ...formData, coordinador_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar coordinador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Ninguno</SelectItem>
                    {coordinadores.map(coord => (
                      <SelectItem key={coord.id} value={coord.id}>
                        {coord.nombre} (#{coord.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="skills">
              <HabilidadesEditor
                habilidades={formData.habilidades}
                idiomas={formData.idiomas}
                certificaciones={formData.certificaciones}
                onHabilidadesChange={(h) => setFormData({ ...formData, habilidades: h })}
                onIdiomasChange={(i) => setFormData({ ...formData, idiomas: i })}
                onCertificacionesChange={(c) => setFormData({ ...formData, certificaciones: c })}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
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