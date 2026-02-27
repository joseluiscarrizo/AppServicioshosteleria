import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const STALE_TIME = 5 * 60 * 1000;  // 5 minutes
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

function getDateWindow() {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 6, 0);
  return {
    desdeStr: format(desde, 'yyyy-MM-dd'),
    hastaStr: format(hasta, 'yyyy-MM-dd'),
  };
}

/**
 * Combined hook that fetches pedidos and asignaciones in a single coordinated call,
 * using shared staleTime/cacheTime to avoid redundant re-fetches across pages.
 */
export function useOptimizedPedidosWithAsignaciones() {
  const { desdeStr, hastaStr } = getDateWindow();

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos'],
    queryFn: async () => {
      try {
        const data = await base44.entities.Pedido.filter(
          { dia: { $gte: desdeStr, $lte: hastaStr } },
          '-dia',
          300
        );
        return data.sort((a: { dia?: string }, b: { dia?: string }) =>
          (a.dia || '').localeCompare(b.dia || '')
        );
      } catch {
        const data = await base44.entities.Pedido.list('-dia', 300);
        return data.sort((a: { dia?: string }, b: { dia?: string }) =>
          (a.dia || '').localeCompare(b.dia || '')
        );
      }
    },
    staleTime: STALE_TIME,
    cacheTime: CACHE_TIME,
  });

  const { data: asignaciones = [], isLoading: loadingAsignaciones } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: async () => {
      try {
        return await base44.entities.AsignacionCamarero.filter(
          { fecha_pedido: { $gte: desdeStr, $lte: hastaStr } },
          '-created_date',
          500
        );
      } catch {
        return await base44.entities.AsignacionCamarero.list('-created_date', 500);
      }
    },
    staleTime: STALE_TIME,
    cacheTime: CACHE_TIME,
  });

  return {
    pedidos,
    asignaciones,
    isLoading: loadingPedidos || loadingAsignaciones,
  };
}

/**
 * Combined hook that fetches camareros and disponibilidades together,
 * using shared staleTime/cacheTime to avoid redundant re-fetches across pages.
 */
export function useOptimizedCamarerosWithDisponibilidad() {
  const { data: camareros = [], isLoading: loadingCamareros } = useQuery({
    queryKey: ['camareros'],
    queryFn: () => base44.entities.Camarero.list('nombre'),
    staleTime: STALE_TIME,
    cacheTime: CACHE_TIME,
  });

  const { data: disponibilidades = [], isLoading: loadingDisp } = useQuery({
    queryKey: ['disponibilidades'],
    queryFn: () => base44.entities.Disponibilidad.list('-fecha', 500),
    staleTime: STALE_TIME,
    cacheTime: CACHE_TIME,
  });

  return {
    camareros,
    disponibilidades,
    isLoading: loadingCamareros || loadingDisp,
  };
}
