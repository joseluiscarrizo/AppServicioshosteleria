// htmlSanitizer.ts

/**
 * Escapes special HTML characters to prevent XSS injection.
 * @param {unknown} value - The value to escape.
 * @returns {string} - HTML-escaped string.
 */
export function escapeHtml(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Sanitizes a string by escaping HTML special characters and stripping any
 * remaining HTML-encoded tag patterns. Escaping is applied first so that
 * no raw `<` or `>` characters remain before the pattern removal step.
 * @param {unknown} value - The value to sanitize.
 * @returns {string} - Sanitized plain-text string safe for HTML contexts.
 */
export function sanitizeHtml(value: unknown): string {
    if (value === null || value === undefined) return '';
    // Escape first to neutralise any HTML characters, then strip encoded tag artefacts
    return escapeHtml(value).replace(/&lt;[^&]*&gt;/g, '');
}
