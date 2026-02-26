


export function createPageUrl(pageName: string) {
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}

export { default as Logger } from './logger';
export { validateEmail, validateToken, validatePhoneNumber, validateDate, validateRequiredFields } from './validators';
export { default as ErrorNotificationService } from './errorNotificationService';
export { DatabaseError, ValidationError, handleWebhookError } from './webhookImprovements';
export { generatePassword } from './passwordGenerator';
export { validatePassword } from './passwordValidator';

// Resilience exports
export { CircuitBreaker } from './resilience/circuitBreaker';
export { CircuitBreakerError, RetryError } from './resilience/types';
export { retryWithBackoff } from './resilience/retryWithBackoff';
export { executeResilientAPICall, resetCircuitBreaker, clearAllCircuitBreakers } from './resilience/resilientAPI';