import Logger from './Logger';
import { validateNotification } from './validators';

class NotificationService {
    constructor() {
        this.retryQueue = [];
    }

    sendNotification(notification) {
        try {
            // Validate notification
            validateNotification(notification);

            // Log the notification sending attempt
            Logger.info(`Sending notification: ${JSON.stringify(notification)}`);

            // Logic to send notification
            // If sending fails, add to retry queue
            this.addToRetryQueue(notification);

        } catch (error) {
            Logger.error(`Failed to send notification: ${error.message}`);
            throw error; // Rethrow the error after logging
        }
    }

    addToRetryQueue(notification) {
        this.retryQueue.push(notification);
        Logger.info(`Added to retry queue: ${JSON.stringify(notification)}`);
    }

    processRetryQueue() {
        while (this.retryQueue.length > 0) {
            const notification = this.retryQueue.shift();
            try {
                this.sendNotification(notification);
            } catch (error) {
                Logger.error(`Retry failed for notification: ${JSON.stringify(notification)} - Error: ${error.message}`);
            }
        }
    }
}

export default NotificationService;
