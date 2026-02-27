import { describe, test, expect } from 'vitest';
import {
  validateWebhookSignature,
  verifyAndParseWebhookRequest
} from '../../utils/webhookValidator.ts';

const APP_SECRET = 'test-app-secret';

// Pre-computed: HMAC-SHA256('test-app-secret', '{"test":true}')
async function computeSignature(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return 'sha256=' + Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('webhookValidator', () => {
  describe('validateWebhookSignature', () => {
    test('returns true for a valid signature', async () => {
      const body = '{"entry":[]}';
      const header = await computeSignature(APP_SECRET, body);
      const result = await validateWebhookSignature(body, header, APP_SECRET);
      expect(result).toBe(true);
    });

    test('returns false for an invalid signature', async () => {
      const body = '{"entry":[]}';
      const result = await validateWebhookSignature(body, 'sha256=invalidsig', APP_SECRET);
      expect(result).toBe(false);
    });

    test('returns false when signature header is null', async () => {
      const result = await validateWebhookSignature('{}', null, APP_SECRET);
      expect(result).toBe(false);
    });

    test('returns false when signature header has wrong prefix', async () => {
      const body = '{}';
      const header = await computeSignature(APP_SECRET, body);
      const wrongPrefix = header.replace('sha256=', 'sha1=');
      const result = await validateWebhookSignature(body, wrongPrefix, APP_SECRET);
      expect(result).toBe(false);
    });

    test('returns false when body has been tampered with', async () => {
      const originalBody = '{"entry":[]}';
      const tamperedBody = '{"entry":["tampered"]}';
      const header = await computeSignature(APP_SECRET, originalBody);
      const result = await validateWebhookSignature(tamperedBody, header, APP_SECRET);
      expect(result).toBe(false);
    });

    test('returns false when wrong secret is used', async () => {
      const body = '{"entry":[]}';
      const header = await computeSignature('correct-secret', body);
      const result = await validateWebhookSignature(body, header, 'wrong-secret');
      expect(result).toBe(false);
    });
  });

  describe('verifyAndParseWebhookRequest', () => {
    test('returns parsed body for a valid request', async () => {
      const body = '{"entry":[],"object":"whatsapp_business_account"}';
      const header = await computeSignature(APP_SECRET, body);
      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: { 'x-hub-signature-256': header, 'content-type': 'application/json' },
        body
      });
      const parsed = await verifyAndParseWebhookRequest(req, APP_SECRET);
      expect(parsed).toEqual({ entry: [], object: 'whatsapp_business_account' });
    });

    test('throws for a request with invalid signature', async () => {
      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: { 'x-hub-signature-256': 'sha256=badsig', 'content-type': 'application/json' },
        body: '{}'
      });
      await expect(verifyAndParseWebhookRequest(req, APP_SECRET)).rejects.toThrow(
        'Invalid webhook signature'
      );
    });

    test('throws for a request with no signature header', async () => {
      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}'
      });
      await expect(verifyAndParseWebhookRequest(req, APP_SECRET)).rejects.toThrow(
        'Invalid webhook signature'
      );
    });
  });
});
