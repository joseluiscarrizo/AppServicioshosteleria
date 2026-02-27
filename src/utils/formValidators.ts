// formValidators.ts - Frontend form validation utilities

export interface ValidationResult {
    valid: boolean;
    errors: Record<string, string>;
}

/** Maximum allowed file size in bytes (10 MB). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for document uploads. */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Allowed file extensions for document uploads (lowercase). */
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

/**
 * Validates a file upload for document management.
 * Checks MIME type, file extension, and file size.
 * @param file - The File object to validate.
 * @returns ValidationResult with errors keyed by field name.
 */
export function validateDocumentFile(file: File): ValidationResult {
    const errors: Record<string, string> = {};

    if (!file) {
        errors.file = 'Selecciona un archivo';
        return { valid: false, errors };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.file = `El archivo supera el tamaño máximo permitido de 10 MB`;
    }

    // Check MIME type
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) {
        errors.file = 'Tipo de archivo no permitido. Usa PDF, JPG, PNG, DOC o DOCX';
    }

    // Check file extension as a secondary guard
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
        errors.file = 'Extensión de archivo no permitida. Usa .pdf, .jpg, .jpeg, .png, .doc o .docx';
    }

    return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates the document upload form fields (name, type, expiration date).
 * @param nombreDoc - The document name.
 * @param tipoDoc - The document type identifier.
 * @param fechaExpiracion - Optional expiration date string (YYYY-MM-DD).
 * @returns ValidationResult with errors keyed by field name.
 */
export function validateDocumentForm(
    nombreDoc: string,
    tipoDoc: string,
    fechaExpiracion: string
): ValidationResult {
    const errors: Record<string, string> = {};

    if (!nombreDoc || !nombreDoc.trim()) {
        errors.nombreDoc = 'El nombre del documento es obligatorio';
    } else if (nombreDoc.trim().length > 200) {
        errors.nombreDoc = 'El nombre no puede superar los 200 caracteres';
    }

    if (!tipoDoc) {
        errors.tipoDoc = 'Selecciona un tipo de documento';
    }

    if (fechaExpiracion) {
        const today = new Date().toISOString().split('T')[0];
        if (fechaExpiracion < today) {
            errors.fechaExpiracion = 'La fecha de expiración no puede ser anterior a hoy';
        }
    }

    return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates the WhatsApp template form.
 * @param nombre - The template name.
 * @param contenido - The template message content.
 * @returns ValidationResult with errors keyed by field name.
 */
export function validateTemplateForm(nombre: string, contenido: string): ValidationResult {
    const errors: Record<string, string> = {};

    if (!nombre || !nombre.trim()) {
        errors.nombre = 'El nombre de la plantilla es obligatorio';
    } else if (nombre.trim().length > 100) {
        errors.nombre = 'El nombre no puede superar los 100 caracteres';
    }

    if (!contenido || !contenido.trim()) {
        errors.contenido = 'El contenido del mensaje es obligatorio';
    } else if (contenido.trim().length > 4096) {
        errors.contenido = 'El contenido no puede superar los 4096 caracteres (límite de WhatsApp)';
    }

    return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates a client (cliente) form.
 * @param data - Object containing the form fields.
 * @returns ValidationResult with errors keyed by field name.
 */
export function validateClienteForm(data: {
    nombre?: string;
    email_1?: string;
    email_2?: string;
    telefono_1?: string;
    telefono_2?: string;
}): ValidationResult {
    const errors: Record<string, string> = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!data.nombre || !data.nombre.trim()) {
        errors.nombre = 'El nombre del cliente es obligatorio';
    } else if (data.nombre.trim().length > 150) {
        errors.nombre = 'El nombre no puede superar los 150 caracteres';
    }

    if (data.email_1 && !emailRegex.test(data.email_1)) {
        errors.email_1 = 'El formato del email principal no es válido';
    }

    if (data.email_2 && !emailRegex.test(data.email_2)) {
        errors.email_2 = 'El formato del email secundario no es válido';
    }

    return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates the availability (disponibilidad) date input.
 * Ensures the date is a valid YYYY-MM-DD string and not in the past.
 * @param date - The date string to validate.
 * @param allowPast - Whether past dates are allowed (default: false).
 * @returns ValidationResult with errors keyed by field name.
 */
export function validateDisponibilidadDate(date: string, allowPast = false): ValidationResult {
    const errors: Record<string, string> = {};
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!date) {
        errors.fecha = 'La fecha es obligatoria';
    } else if (!dateRegex.test(date)) {
        errors.fecha = 'Formato de fecha inválido (se espera AAAA-MM-DD)';
    } else {
        const parsed = new Date(date + 'T00:00:00');
        if (isNaN(parsed.getTime())) {
            errors.fecha = 'La fecha proporcionada no es válida';
        } else if (!allowPast) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (parsed < today) {
                errors.fecha = 'No se pueden registrar disponibilidades en fechas pasadas';
            }
        }
    }

    return { valid: Object.keys(errors).length === 0, errors };
}
