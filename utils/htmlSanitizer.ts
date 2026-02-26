// escapeHtml function to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, &amp;)
        .replace(/</g, &lt;)
        .replace(/>/g, &gt;)
        .replace(/"/g, &quot;)
        .replace(/'/g, &#39;);
}

// sanitizeHtml function to sanitize HTML
function sanitizeHtml(dirty) {
    // A more advanced implementation with a library like DOMPurify is recommended for production.
    // For simplicity, this basic implementation is provided as an example.
    var doc = new DOMParser().parseFromString(dirty, 'text/html');
    return doc.body.textContent || '';
}

export { escapeHtml, sanitizeHtml };