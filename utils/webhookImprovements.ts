// webhookImprovements.ts

/**
 * Custom error class for database operation failures.
 */
export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

/**
 * Custom error class for data validation failures.
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Wraps a database operation and converts any thrown error into a DatabaseError.
 * @param operation - Async function representing the DB operation.
 * @returns The result of the operation.
 */
export async function executeDbOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        throw new DatabaseError(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Wraps a Gmail/email operation and rethrows errors with context.
 * @param operation - Async function representing the email operation.
 * @returns The result of the operation.
 */
export async function executeGmailOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        throw new Error('Email operation failed: ' + (error instanceof Error ? error.message : String(error)));
    }
}
