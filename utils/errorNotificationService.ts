// errorNotificationService.ts
import Logger from './logger.ts';

class ErrorNotificationService {
    constructor(private phoneNumber: string) {}

    notifyUser(message: string): void {
        Logger.warn(`[ErrorNotification] ${this.phoneNumber}: ${message}`);
    }
}

const errorMessages = {
    NETWORK_ERROR: 'There was a network error. Please try again later.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'An error occurred on the server. Please try again later.',
};

export default ErrorNotificationService;
export { errorMessages };