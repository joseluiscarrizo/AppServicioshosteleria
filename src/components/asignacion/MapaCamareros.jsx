import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, User, Star, Navigation, Phone, Mail, Sparkles } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Iconos personalizados
const createCustomIcon = (color, icon) => L.divIcon({
  html: `<div style="background: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
    <span style="color: white; font-size: 20px;">${icon}</span>
  </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const camareroIcon = createCustomIcon('#1e3a5f', '👤');
const eventoIcon = createCustomIcon('#10b981', '📍');
const camareroOcupadoIcon = createCustomIcon('#f59e0b', '⏰');

// Componente para centrar el mapa
function MapCenter({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function MapaCamareros({ pedido, onAsignar }) {
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [camareroSeleccionado, setCamareroSeleccionado] = useState(null);
  const [mostrarRadio, setMostrarRadio] = useState(true);

  const { data: camareros = [] } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre')
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.AsignacionCamarero.list('-created_date', 1000)
  });

  // Camareros con ubicación
  const camarerosConUbicacion = useMemo(() => {
    return camareros.filter(c => c.latitud && c.longitud && !c.en_reserva);
  }, [camareros]);

  // Filtrar camareros
  const camarerosFiltrados = useMemo(() => {
    return camarerosConUbicacion.filter(c => {
      const matchBusqueda = !busqueda || 
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.codigo?.toLowerCase().includes(busqueda.toLowerCase());

      const matchEstado = filtroEstado === 'todos' || 
        (filtroEstado === 'disponible' && c.disponible) ||
        (filtroEstado === 'ocupado' && !c.disponible);

      return matchBusqueda && matchEstado;
    });
  }, [camarerosConUbicacion, busqueda, filtroEstado]);

  // Calcular distancia desde el evento
  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Camareros ordenados por distancia
  const camarerosOrdenados = useMemo(() => {
    if (!pedido?.latitud || !pedido?.longitud) return camarerosFiltrados;

    return camarerosFiltrados.map(c => ({
      ...c,
      distancia: calcularDistancia(pedido.latitud, pedido.longitud, c.latitud, c.longitud)
    })).sort((a, b) => (a.distancia || 999) - (b.distancia || 999));
  }, [camarerosFiltrados, pedido]);

  // Centro del mapa
  const centroMapa = useMemo(() => {
    if (pedido?.latitud && pedido?.longitud) {
      return [pedido.latitud, pedido.longitud];
    }
    if (camarerosConUbicacion.length > 0) {
      const sumLat = camarerosConUbicacion.reduce((sum, c) => sum + c.latitud, 0);
      const sumLon = camarerosConUbicacion.reduce((sum, c) => sum + c.longitud, 0);
      return [sumLat / camarerosConUbicacion.length, sumLon / camarerosConUbicacion.length];
    }
    return [40.4168, -3.7038]; // Madrid por defecto
  }, [pedido, camarerosConUbicacion]);

  // Verificar si el camarero está ocupado ese día
  const estaOcupado = (camarero) => {
    if (!pedido?.dia) return false;
    return asignaciones.some(a => 
      a.camarero_id === camarero.id && 
      a.fecha_pedido === pedido.dia
    );
  };

  return (
    <Dialog open={true} onOpenChange={() => {}} >
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#1e3a5f]" />
            Mapa de Camareros - Vista en Tiempo Real
          </DialogTitle>
          {pedido && (
            <p className="text-sm text-slate-600">
              Evento: <strong>{pedido.cliente}</strong> • {pedido.lugar_evento}
            </p>
          )}
        </DialogHeader>

        <div className="flex gap-4 px-6 pb-4">
          <Input
            placeholder="Buscar camarero..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="disponible">Disponibles</SelectItem>
              <SelectItem value="ocupado">Ocupados</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={mostrarRadio ? "default" : "outline"}
            size="sm"
            onClick={() => setMostrarRadio(!mostrarRadio)}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Radio de trabajo
          </Button>
          <div className="ml-auto text-sm text-slate-600">
            {camarerosOrdenados.length} camareros en mapa
          </div>
        </div>

        <div className="flex gap-4 h-[70vh] px-6 pb-6">
          {/* Mapa */}
          <div className="flex-1 rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg">
            <MapContainer 
              center={centroMapa} 
              zoom={11} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenter center={centroMapa} />

              {/* Marcador del evento */}
              {pedido?.latitud && pedido?.longitud && (
                <>
                  <Marker position={[pedido.latitud, pedido.longitud]} icon={eventoIcon}>
                    <Popup>
                      <div className="p-2">
                        <p className="font-bold text-emerald-700">📍 Evento</p>
                        <p className="text-sm">{pedido.cliente}</p>
                        <p className="text-xs text-slate-600">{pedido.lugar_evento}</p>
                      </div>
                    </Popup>
                  </Marker>
                  {mostrarRadio && (
                    <Circle
                      center={[pedido.latitud, pedido.longitud]}
                      radius={10000}
                      pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1 }}
                    />
                  )}
                </>
              )}

              {/* Marcadores de camareros */}
              {camarerosOrdenados.map(camarero => {
                const ocupado = estaOcupado(camarero);
                const icon = ocupado ? camareroOcupadoIcon : camareroIcon;

                return (
                  <React.Fragment key={camarero.id}>
                    <Marker 
                      position={[camarero.latitud, camarero.longitud]} 
                      icon={icon}
                      eventHandlers={{
                        click: () => setCamareroSeleccionado(camarero)
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <p className="font-bold">{camarero.nombre}</p>
                          <p className="text-xs text-slate-500">#{camarero.codigo}</p>
                          {camarero.distancia && (
                            <p className="text-xs text-blue-600 mt-1">
                              📍 {camarero.distancia.toFixed(1)} km del evento
                            </p>
                          )}
                          {camarero.valoracion_promedio > 0 && (
                            <p className="text-xs flex items-center gap-1 mt-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {camarero.valoracion_promedio.toFixed(1)}
                            </p>
                          )}
                          <Button 
                            size="sm" 
                            className="mt-2 w-full"
                            onClick={() => onAsignar && onAsignar(camarero)}
                          >
                            Asignar
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                    {mostrarRadio && camarero.radio_trabajo_km && (
                      <Circle
                        center={[camarero.latitud, camarero.longitud]}
                        radius={camarero.radio_trabajo_km * 1000}
                        pathOptions={{ 
                          color: ocupado ? '#f59e0b' : '#1e3a5f', 
                          fillColor: ocupado ? '#f59e0b' : '#1e3a5f', 
                          fillOpacity: 0.05,
                          weight: 1,
                          dashArray: '5, 5'
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </div>

          {/* Panel lateral con lista */}
          <Card className="w-80 flex flex-col">
            <div className="p-4 border-b bg-slate-50">
              <h3 className="font-semibold text-slate-800">Camareros Cercanos</h3>
              <p className="text-xs text-slate-500 mt-1">Ordenados por distancia</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {camarerosOrdenados.map(camarero => {
                const ocupado = estaOcupado(camarero);
                
                return (
                  <Card 
                    key={camarero.id}
                    className={`p-3 cursor-pointer transition-all ${
                      camareroSeleccionado?.id === camarero.id 
                        ? 'border-2 border-[#1e3a5f] bg-blue-50' 
                        : 'hover:shadow-md'
                    } ${ocupado ? 'bg-orange-50' : ''}`}
                    onClick={() => setCamareroSeleccionado(camarero)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{camarero.nombre}</p>
                        <p className="text-xs text-slate-500 font-mono">#{camarero.codigo}</p>
                      </div>
                      {ocupado && (
                        <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">
                          Ocupado
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      {camarero.distancia && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Navigation className="w-3 h-3" />
                          {camarero.distancia.toFixed(1)} km
                        </div>
                      )}
                      {camarero.valoracion_promedio > 0 && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {camarero.valoracion_promedio.toFixed(1)}
                        </div>
                      )}
                      {camarero.especialidad && (
                        <Badge variant="outline" className="text-xs">
                          {camarero.especialidad}
                        </Badge>
                      )}
                    </div>

                    {pedido && onAsignar && (
                      <Button 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAsignar(camarero);
                        }}
                        disabled={ocupado}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Asignar
                      </Button>
                    )}
                  </Card>
                );
              })}
              {camarerosOrdenados.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay camareros en el mapa</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Leyenda */}
        <div className="flex items-center justify-center gap-6 px-6 pb-4 text-xs text-slate-600 border-t pt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#1e3a5f]"></div>
            Disponible
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#f59e0b]"></div>
            Ocupado
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#10b981]"></div>
            Evento
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}