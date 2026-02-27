// errorNotificationService.ts
import Logger from './logger';

class ErrorNotificationService {
    private phoneNumber: string;

    constructor(phoneNumber: string) {
        this.phoneNumber = phoneNumber;
    }

    notifyUser(message: string): void {
        if (!this.phoneNumber) {
            return;
        }
        // Logic to send WhatsApp message to the user
        Logger.info(`Sending message to ${this.phoneNumber}: ${message}`);
    }
}

export const errorMessages = {
    NETWORK_ERROR: 'There was a network error. Please try again later.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'An error occurred on the server. Please try again later.',
};

export default ErrorNotificationService;