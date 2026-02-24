class ErrorNotificationService {
    constructor(phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    notifyUser(message) {
        console.log(`Sending message to ${this.phoneNumber}: ${message}`);
    }
}

export const errorMessages = {
    NETWORK_ERROR: 'There was a network error. Please try again later.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'An error occurred on the server. Please try again later.',
};

export default ErrorNotificationService;
