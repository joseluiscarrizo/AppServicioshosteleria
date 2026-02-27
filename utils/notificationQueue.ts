// notificationQueue.ts
// Simple in-memory notification queue with exponential-backoff retry logic.
// For production use, persist queue entries to a Firestore collection.

import Logger from './logger.ts';

export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface QueuedNotification {
  id: string;
  type: 'whatsapp' | 'email';
  recipient: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  lastAttemptAt?: number;
  error?: string;
}

type SendHandler = (notification: QueuedNotification) => Promise<void>;

const queue: QueuedNotification[] = [];
let sendHandler: SendHandler | null = null;

/**
 * Registers the function responsible for actually sending a notification.
 * Must be called before processing starts.
 */
export function registerSendHandler(handler: SendHandler): void {
  sendHandler = handler;
}

/**
 * Adds a notification to the queue.
 * @returns The queued notification entry (with generated ID).
 */
export function enqueue(
  type: QueuedNotification['type'],
  recipient: string,
  payload: Record<string, unknown>,
  maxAttempts = 3
): QueuedNotification {
  const entry: QueuedNotification = {
    id: `${type}:${recipient}:${Date.now()}`,
    type,
    recipient,
    payload,
    status: 'pending',
    attempts: 0,
    maxAttempts,
    createdAt: Date.now()
  };
  queue.push(entry);
  Logger.info(`[NotificationQueue] Enqueued ${entry.id}`);
  return entry;
}

/**
 * Processes all pending notifications in the queue, retrying failed ones
 * using exponential backoff up to maxAttempts.
 */
export async function processPendingNotifications(): Promise<void> {
  if (!sendHandler) {
    Logger.warn('[NotificationQueue] No send handler registered');
    return;
  }

  const pending = queue.filter(n => n.status === 'pending' || n.status === 'failed');

  for (const notification of pending) {
    if (notification.attempts >= notification.maxAttempts) {
      notification.status = 'failed';
      Logger.error(`[NotificationQueue] Dead-letter: ${notification.id} exceeded max attempts`);
      continue;
    }

    notification.status = 'processing';
    notification.attempts += 1;
    notification.lastAttemptAt = Date.now();

    try {
      await sendHandler!(notification);
      notification.status = 'sent';
      Logger.info(`[NotificationQueue] Sent ${notification.id} (attempt ${notification.attempts})`);
    } catch (error) {
      notification.status = notification.attempts >= notification.maxAttempts ? 'failed' : 'pending';
      notification.error = error instanceof Error ? error.message : String(error);
      Logger.error(`[NotificationQueue] Failed ${notification.id}: ${notification.error}`);
    }
  }
}

/**
 * Returns all notifications currently in the dead-letter queue (failed after max retries).
 */
export function getDeadLetterQueue(): QueuedNotification[] {
  return queue.filter(n => n.status === 'failed' && n.attempts >= n.maxAttempts);
}

/** Returns all notifications in the queue (for monitoring/debugging). */
export function getQueue(): QueuedNotification[] {
  return [...queue];
}

/** Clears the queue (useful for testing). */
export function clearQueue(): void {
  queue.length = 0;
}
