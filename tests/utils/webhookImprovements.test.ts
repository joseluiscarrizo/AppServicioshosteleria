import { describe, test, expect } from 'vitest';
import {
  handleWebhookError,
  ValidationError,
  DatabaseError,
} from '@/utils/webhookImprovements';

describe('handleWebhookError', () => {
  test('maps ValidationError to validation_error type (non-retryable)', () => {
    const error = new ValidationError('Field required');
    const result = handleWebhookError(error);
    expect(result.type).toBe('validation_error');
    expect(result.message).toBe('Field required');
    expect(result.retryable).toBe(false);
  });

  test('maps DatabaseError to database_error type (retryable)', () => {
    const error = new DatabaseError('DB unavailable');
    const result = handleWebhookError(error);
    expect(result.type).toBe('database_error');
    expect(result.message).toBe('DB unavailable');
    expect(result.retryable).toBe(true);
  });

  test('maps HTTP 401 to auth_required (non-retryable)', () => {
    const error = { status: 401, message: 'Unauthorized' };
    const result = handleWebhookError(error);
    expect(result.type).toBe('auth_required');
    expect(result.retryable).toBe(false);
  });

  test('maps HTTP 403 to auth_required (non-retryable)', () => {
    const error = { status: 403, message: 'Forbidden' };
    const result = handleWebhookError(error);
    expect(result.type).toBe('auth_required');
    expect(result.retryable).toBe(false);
  });

  test('maps HTTP 500 to server_error (retryable)', () => {
    const error = { status: 500, message: 'Internal Server Error' };
    const result = handleWebhookError(error);
    expect(result.type).toBe('server_error');
    expect(result.retryable).toBe(true);
  });

  test('maps generic Error to network_error (retryable)', () => {
    const error = new Error('fetch failed');
    const result = handleWebhookError(error);
    expect(result.type).toBe('network_error');
    expect(result.message).toBe('fetch failed');
    expect(result.retryable).toBe(true);
  });

  test('maps body type user_not_registered correctly', () => {
    const error = { response: { status: 400, data: { type: 'user_not_registered' } } };
    const result = handleWebhookError(error);
    expect(result.type).toBe('user_not_registered');
    expect(result.retryable).toBe(false);
  });

  test('returns structured object with type, message, retryable properties', () => {
    const result = handleWebhookError(new Error('test'));
    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('retryable');
  });
});

describe('ValidationError', () => {
  test('has correct name and message', () => {
    const err = new ValidationError('bad input');
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('bad input');
    expect(err instanceof Error).toBe(true);
  });
});

describe('DatabaseError', () => {
  test('has correct name and message', () => {
    const err = new DatabaseError('connection refused');
    expect(err.name).toBe('DatabaseError');
    expect(err.message).toBe('connection refused');
    expect(err instanceof Error).toBe(true);
  });
});
