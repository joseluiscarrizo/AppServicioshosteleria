import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  enqueue,
  registerSendHandler,
  processPendingNotifications,
  getDeadLetterQueue,
  getQueue,
  clearQueue
} from '../../utils/notificationQueue.ts';

describe('notificationQueue', () => {
  beforeEach(() => {
    clearQueue();
    registerSendHandler(vi.fn().mockResolvedValue(undefined));
  });

  describe('enqueue', () => {
    test('adds a notification to the queue with pending status', () => {
      const entry = enqueue('whatsapp', '34600000000', { mensaje: 'Hola' });
      expect(entry.status).toBe('pending');
      expect(entry.type).toBe('whatsapp');
      expect(entry.recipient).toBe('34600000000');
      expect(entry.payload).toEqual({ mensaje: 'Hola' });
      expect(entry.attempts).toBe(0);
    });

    test('assigns a unique ID to each notification', () => {
      const e1 = enqueue('whatsapp', '34600000001', {});
      const e2 = enqueue('email', 'a@b.com', {});
      expect(e1.id).not.toBe(e2.id);
    });

    test('respects custom maxAttempts', () => {
      const entry = enqueue('email', 'a@b.com', {}, 5);
      expect(entry.maxAttempts).toBe(5);
    });
  });

  describe('processPendingNotifications', () => {
    test('sends pending notifications and marks them as sent', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registerSendHandler(handler);
      enqueue('whatsapp', '34600000000', { mensaje: 'Test' });

      await processPendingNotifications();

      const q = getQueue();
      expect(q[0].status).toBe('sent');
      expect(handler).toHaveBeenCalledOnce();
    });

    test('marks notifications as failed after exhausting retries', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('API down'));
      registerSendHandler(handler);
      enqueue('whatsapp', '34600000000', {}, 1);

      await processPendingNotifications();

      const q = getQueue();
      expect(q[0].status).toBe('failed');
      expect(q[0].error).toBe('API down');
    });

    test('does not retry notifications already in failed/max-attempts state', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('fail'));
      registerSendHandler(handler);
      const entry = enqueue('whatsapp', '34600000000', {}, 1);

      await processPendingNotifications(); // fails once -> failed
      handler.mockClear();
      await processPendingNotifications(); // should not retry

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getDeadLetterQueue', () => {
    test('returns only failed notifications that exhausted retries', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('fail'));
      registerSendHandler(handler);
      enqueue('email', 'a@b.com', {}, 1);
      enqueue('whatsapp', '34600000000', {}, 3);

      // Process once: both fail attempt 1; email hits max (1), whatsapp still has room
      await processPendingNotifications();

      const dlq = getDeadLetterQueue();
      const dlqTypes = dlq.map(n => n.type);
      expect(dlqTypes).toContain('email');
    });
  });
});
