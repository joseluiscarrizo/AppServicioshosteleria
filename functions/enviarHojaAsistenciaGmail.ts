// Refactored enviarHojaAsistenciaGmail.ts

// Import necessary modules
import { Buffer } from 'buffer';
import nodemailer from 'nodemailer';
import * as validator from 'validator';

// Interface for email validation results
interface EmailValidationResult {
    isValid: boolean;
    message: string;
}

// Function to validate email
function validateEmail(email: string): EmailValidationResult {
    if (!validator.isEmail(email)) {
        return { isValid: false, message: 'Invalid email format.' };
    }
    return { isValid: true, message: 'Valid email.' };
}

// Function to sanitize HTML
function sanitizeHTML(html: string): string {
    // Implement sanitization logic here
    return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Function for RBAC checks
function checkRBAC(user: string): boolean {
    // Mock RBAC check, replace with actual logic
    const allowedUsers = ['admin', 'manager'];
    return allowedUsers.includes(user);
}

// Main function to send attendance email
async function enviarHojaAsistenciaGmail(email: string, content: string, user: string) {
    // Validate input email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
        throw new Error(emailValidation.message);
    }

    // Check RBAC
    if (!checkRBAC(user)) {
        throw new Error('User does not have permission to send emails.');
    }

    // Sanitize content
    const sanitizedContent = sanitizeHTML(content);

    // Retry logic for sending email
    const maxRetries = 3;
    let attempt = 0;
    let success = false;
    let lastError: Error | null = null;

    while (attempt < maxRetries && !success) {
        attempt++;
        try {
            const transporter = nodemailer.createTransport({
                // SMTP configuration
            });
            await transporter.sendMail({
                from: 'your-email@gmail.com',
                to: email,
                subject: 'Attendance Sheet',
                html: sanitizedContent,
            });
            success = true; // Email sent successfully
        } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${attempt} failed: ${lastError.message}`);
        }
    }

    if (!success) {
        throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError?.message}`);
    }

    console.log('Email sent successfully!');
}

// Export the function for external use
export default enviarHojaAsistenciaGmail;

