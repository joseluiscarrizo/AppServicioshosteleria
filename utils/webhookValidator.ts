// webhookValidator.ts
// Webhook signature verification for WhatsApp Cloud API (Meta).
// Meta signs each webhook POST with HMAC-SHA256 using the app secret.
// Reference: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validation-requests

/**
 * Converts a hex string to a Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Encodes a string as a Uint8Array.
 */
function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Computes HMAC-SHA256 of the raw request body using the provided secret key.
 * Uses the Web Crypto API which is available in both browsers and Deno.
 *
 * @param secret - The app secret from Meta Developer Dashboard
 * @param rawBody - The raw request body as a string
 * @returns The computed HMAC hex string
 */
async function computeHmacSha256(secret: string, rawBody: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encodeText(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', keyMaterial, encodeText(rawBody));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time comparison of two hex strings to prevent timing attacks.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBytes = encodeText(a);
  const bBytes = encodeText(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

/**
 * Validates the X-Hub-Signature-256 header sent by Meta on webhook POST requests.
 *
 * @param rawBody - The raw (unparsed) request body string
 * @param signatureHeader - Value of the X-Hub-Signature-256 header (format: "sha256=<hex>")
 * @param appSecret - The app secret from the Meta Developer Dashboard
 * @returns true if the signature is valid, false otherwise
 */
export async function validateWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const receivedHex = signatureHeader.slice('sha256='.length);
  const computedHex = await computeHmacSha256(appSecret, rawBody);
  return safeEqual(receivedHex, computedHex);
}

/**
 * Extracts and validates the webhook signature from a Request object.
 * Returns the parsed body if the signature is valid, or throws if invalid.
 *
 * @param req - The incoming Request
 * @param appSecret - The app secret
 * @returns The parsed JSON body
 * @throws Error if signature is missing or invalid
 */
export async function verifyAndParseWebhookRequest(
  req: Request,
  appSecret: string
): Promise<unknown> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-hub-signature-256');
  const isValid = await validateWebhookSignature(rawBody, signatureHeader, appSecret);
  if (!isValid) {
    throw new Error('Invalid webhook signature');
  }
  return JSON.parse(rawBody);
}
