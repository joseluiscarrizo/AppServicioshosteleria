// errorNotificationService.ts

class ErrorNotificationService {
    constructor(private phoneNumber: string) {}

    notifyUser(message: string): void {
        // Logic to send WhatsApp message to the user
        console.log(`Sending message to ${this.phoneNumber}: ${message}`);
    }
}

const errorMessages = {
    NETWORK_ERROR: 'There was a network error. Please try again later.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'An error occurred on the server. Please try again later.',
};

// Example usage:
const notificationService = new ErrorNotificationService('+123456789');
notificationService.notifyUser(errorMessages.NETWORK_ERROR);