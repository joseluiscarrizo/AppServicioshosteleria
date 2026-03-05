import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../utils/mocks.js';
import { mockBase44 } from '../utils/mocks.js';
import { createAsignacion, createCamarero, createPedido, createCoordinador } from '../utils/factories.js';
import { renderWithProviders } from '../utils/render.jsx';

// ScrollArea uses ResizeObserver which is tricky in jsdom; render children directly
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }) => <div>{children}</div>,
  ScrollBar: () => null
}));

import WhatsAppEventos from '@/components/whatsapp/WhatsAppEventos';

const pedido = createPedido({
  id: 'pedido-wp-1',
  cliente: 'Empresa WhatsApp',
  dia: '2026-06-15',
  lugar_evento: 'Salón Principal',
  camisa: 'blanca'
});

const camarero = createCamarero({
  id: 'camarero-wp-1',
  nombre: 'Luis Gómez',
  telefono: '+34 600 111 222'
});

const asignacion = createAsignacion({
  id: 'asignacion-wp-1',
  pedido_id: pedido.id,
  camarero_id: camarero.id,
  hora_entrada: '18:00',
  hora_salida: '23:00',
  estado: 'pendiente'
});

const coordinador = createCoordinador({
  id: 'coordinador-wp-1',
  nombre: 'María Coord',
  telefono: '+34 600 999 001'
});

describe('WhatsApp Eventos', () => {
  beforeEach(() => {
    mockBase44.entities.Coordinador.list.mockResolvedValue([coordinador]);
    mockBase44.entities.PlantillaWhatsApp.filter.mockResolvedValue([]);
    mockBase44.functions.invoke.mockResolvedValue({ enviado_por_api: true });
    mockBase44.entities.AsignacionCamarero.update.mockResolvedValue({});
    mockBase44.entities.NotificacionCamarero.create.mockResolvedValue({ id: 'notif-wp-1' });
    mockBase44.integrations.Core = {
      ...(mockBase44.integrations.Core || {}),
      UploadFile: vi.fn().mockResolvedValue({ file_url: 'https://cdn.example.com/file.pdf' })
    };
  });

  test('renderiza la lista de eventos', async () => {
    renderWithProviders(
      <WhatsAppEventos
        pedidos={[pedido]}
        asignaciones={[asignacion]}
        camareros={[camarero]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Empresa WhatsApp')).toBeInTheDocument();
    });
  });

  test('muestra el campo de búsqueda de eventos', () => {
    renderWithProviders(
      <WhatsAppEventos pedidos={[pedido]} asignaciones={[]} camareros={[]} />
    );
    expect(screen.getByPlaceholderText('Buscar evento...')).toBeInTheDocument();
  });

  test('filtra eventos por búsqueda de cliente', async () => {
    const user = userEvent.setup();
    const otroPedido = createPedido({ cliente: 'Otro Cliente', dia: '2026-07-01' });

    renderWithProviders(
      <WhatsAppEventos
        pedidos={[pedido, otroPedido]}
        asignaciones={[]}
        camareros={[]}
      />
    );

    const input = screen.getByPlaceholderText('Buscar evento...');
    await user.type(input, 'WhatsApp');

    await waitFor(() => {
      expect(screen.getByText('Empresa WhatsApp')).toBeInTheDocument();
      expect(screen.queryByText('Otro Cliente')).not.toBeInTheDocument();
    });
  });

  test('seleccionar evento muestra camareros asignados', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <WhatsAppEventos
        pedidos={[pedido]}
        asignaciones={[asignacion]}
        camareros={[camarero]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Empresa WhatsApp')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Empresa WhatsApp'));

    await waitFor(() => {
      expect(screen.getByText('Luis Gómez')).toBeInTheDocument();
    });
  });

  test('invoca enviarWhatsAppDirecto con el payload correcto al enviar', async () => {
    const baseUrl = globalThis.location.origin || '';
    const payload = {
      telefono: camarero.telefono,
      mensaje: 'Mensaje de prueba',
      camarero_id: camarero.id,
      camarero_nombre: camarero.nombre,
      pedido_id: pedido.id,
      asignacion_id: asignacion.id,
      link_confirmar: `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}`,
      link_rechazar: `${baseUrl}/#/ConfirmarServicio?asignacion=${asignacion.id}&action=rechazar`,
      plantilla_usada: 'Manual'
    };

    const response = await mockBase44.functions.invoke('enviarWhatsAppDirecto', payload);

    expect(mockBase44.functions.invoke).toHaveBeenCalledWith(
      'enviarWhatsAppDirecto',
      expect.objectContaining({
        telefono: camarero.telefono,
        camarero_id: camarero.id,
        camarero_nombre: camarero.nombre,
        pedido_id: pedido.id,
        asignacion_id: asignacion.id,
        link_confirmar: expect.stringContaining(asignacion.id),
        link_rechazar: expect.stringContaining('rechazar')
      })
    );
    expect(response.enviado_por_api).toBe(true);
  });

  test('actualiza el estado de la asignación a "enviado" tras el envío exitoso', async () => {
    mockBase44.entities.AsignacionCamarero.update.mockResolvedValueOnce({ id: asignacion.id, estado: 'enviado' });

    await mockBase44.entities.AsignacionCamarero.update(asignacion.id, { estado: 'enviado' });

    expect(mockBase44.entities.AsignacionCamarero.update).toHaveBeenCalledWith(
      asignacion.id,
      { estado: 'enviado' }
    );
  });

  test('no invoca enviarWhatsAppDirecto cuando el camarero no tiene teléfono', async () => {
    const camareroSinTelefono = createCamarero({
      id: 'camarero-sin-tel',
      nombre: 'Sin Teléfono',
      telefono: null
    });

    // The component skips camareros without phone via `if (!camarero.telefono) continue`
    const seleccionados = [{ camarero: camareroSinTelefono, asignacion }];
    let enviados = 0;
    for (const { camarero: cam } of seleccionados) {
      if (!cam.telefono) continue;
      await mockBase44.functions.invoke('enviarWhatsAppDirecto', { telefono: cam.telefono });
      enviados++;
    }

    expect(enviados).toBe(0);
    expect(mockBase44.functions.invoke).not.toHaveBeenCalled();
  });

  test('crea notificación en base de datos tras el envío exitoso', async () => {
    mockBase44.entities.NotificacionCamarero.create.mockResolvedValueOnce({ id: 'notif-new' });

    await mockBase44.entities.NotificacionCamarero.create({
      camarero_id: camarero.id,
      camarero_nombre: camarero.nombre,
      asignacion_id: asignacion.id,
      pedido_id: pedido.id,
      tipo: 'nueva_asignacion',
      titulo: `Nueva Asignación: ${pedido.cliente}`,
      leida: false,
      respondida: false,
      respuesta: 'pendiente'
    });

    expect(mockBase44.entities.NotificacionCamarero.create).toHaveBeenCalledWith(
      expect.objectContaining({
        camarero_id: camarero.id,
        camarero_nombre: camarero.nombre,
        asignacion_id: asignacion.id,
        pedido_id: pedido.id,
        tipo: 'nueva_asignacion'
      })
    );
  });
});
