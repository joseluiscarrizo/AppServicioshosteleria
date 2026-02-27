class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DatabaseError';
    }
}

function handleWebhookError(error) {
    if (error instanceof ValidationError) {
        // Handle validation error
        console.error('Validation Error:', error.message);
    } else if (error instanceof DatabaseError) {
        // Handle database error
        console.error('Database Error:', error.message);
    } else {
        // Handle generic error
        console.error('Unknown Error:', error);
    }
}

export { ValidationError, DatabaseError, handleWebhookError };