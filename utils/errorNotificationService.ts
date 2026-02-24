// errorNotificationService.ts

class ErrorNotificationService {
    private phoneNumber: string;

    constructor(phoneNumber: string) {
        this.phoneNumber = phoneNumber;
    }

    notifyUser(message: string): void {
        // Logic to send WhatsApp message to the user
        console.log(`Sending message to ${this.phoneNumber}: ${message}`);
    }
}

export const errorMessages = {
    NETWORK_ERROR: 'There was a network error. Please try again later.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'An error occurred on the server. Please try again later.',
};

export default ErrorNotificationService;