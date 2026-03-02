import { describe, it, expect } from 'vitest';
import { calcularKPIs } from '../../src/components/admin/AdminDashboard.jsx';
describe('calcularKPIs', () => {
  const hoy = new Date().toISOString().split('T')[0];
  const mañana = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const camareros = [
    { id: '1', disponible: true, en_reserva: false },
    { id: '2', disponible: true, en_reserva: true },
    { id: '3', disponible: false, en_reserva: false },
    { id: '4', disponible: true, en_reserva: false },
  ];
  const pedidos = [{ id: 'p1', dia: ayer }, { id: 'p2', dia: hoy }, { id: 'p3', dia: mañana }];
  const coordinadores = [{ id: 'c1' }, { id: 'c2' }];
  const asignaciones = [{ id: 'a1', estado: 'pendiente' }, { id: 'a2', estado: 'confirmado' }, { id: 'a3', estado: 'pendiente' }];

  it('cuenta camareros totales', () => { expect(calcularKPIs(camareros, pedidos, coordinadores, asignaciones).totalCamareros).toBe(4); });
  it('cuenta solo disponibles y no en reserva', () => { expect(calcularKPIs(camareros, pedidos, coordinadores, asignaciones).camarerosDisponibles).toBe(2); });
  it('cuenta eventos activos (hoy y futuros)', () => { expect(calcularKPIs(camareros, pedidos, coordinadores, asignaciones).eventosActivos).toBe(2); });
  it('cuenta solo eventos de hoy', () => { expect(calcularKPIs(camareros, pedidos, coordinadores, asignaciones).eventosHoy).toBe(1); });
  it('cuenta coordinadores', () => { expect(calcularKPIs(camareros, pedidos, coordinadores, asignaciones).totalCoordinadores).toBe(2); });
  it('cuenta solo asignaciones pendientes', () => { expect(calcularKPIs(camareros, pedidos, coordinadores, asignaciones).asignacionesPendientes).toBe(2); });
  it('maneja arrays vacíos', () => {
    const kpis = calcularKPIs([], [], [], []);
    expect(kpis.totalCamareros).toBe(0);
    expect(kpis.eventosActivos).toBe(0);
  });
});
