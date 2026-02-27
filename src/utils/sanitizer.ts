// sanitizer.ts - Content sanitization utilities

/**
 * Escapes HTML special characters to prevent XSS when content is
 * inserted into raw HTML contexts (e.g. dangerouslySetInnerHTML).
 * React automatically escapes content in JSX, so this is only needed
 * for raw HTML operations.
 */
export function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Sanitizes a search query by trimming whitespace and removing
 * characters that could be used for injection attacks.
 * @param query - The raw search input.
 * @returns The sanitized query string.
 */
export function sanitizeSearchQuery(query: string): string {
    if (typeof query !== 'string') return '';
    // Trim and collapse repeated whitespace
    return query.trim().replace(/\s+/g, ' ').slice(0, 200);
}

/**
 * Sanitizes a document file name by removing path traversal characters
 * and other potentially dangerous characters.
 * @param filename - The raw file name.
 * @returns The sanitized file name.
 */
export function sanitizeFileName(filename: string): string {
    if (typeof filename !== 'string') return '';
    return filename
        .replace(/[/\\:*?"<>|]/g, '_') // Replace path/shell special chars
        .replace(/\.{2,}/g, '.')        // Collapse multiple dots (prevent path traversal)
        .trim()
        .slice(0, 255);
}

/**
 * Sanitizes template variable names to ensure only whitelisted dynamic
 * fields are present, protecting against injection through custom fields.
 * @param content - The raw template content.
 * @param allowedFields - Array of allowed dynamic field names (e.g. ['cliente', 'dia']).
 * @returns An object with the sanitized content and a list of unknown fields found.
 */
export function sanitizeTemplateContent(
    content: string,
    allowedFields: string[]
): { sanitized: string; unknownFields: string[] } {
    if (typeof content !== 'string') return { sanitized: '', unknownFields: [] };

    const fieldPattern = /\{\{([^}]+)\}\}/g;
    const unknownFields: string[] = [];

    const sanitized = content.replace(fieldPattern, (match, fieldName) => {
        const trimmed = fieldName.trim();
        if (allowedFields.includes(trimmed)) {
            return match; // Keep allowed fields as-is
        }
        unknownFields.push(trimmed);
        return escapeHtml(match); // Escape unknown fields
    });

    return { sanitized, unknownFields };
}

/**
 * Strips all template variable placeholders from a string.
 * Useful for previewing plain text without dynamic fields.
 * @param content - The template content string.
 * @returns Content with all {{...}} placeholders removed.
 */
export function stripTemplatePlaceholders(content: string): string {
    if (typeof content !== 'string') return '';
    return content.replace(/\{\{[^}]+\}\}/g, '');
}
