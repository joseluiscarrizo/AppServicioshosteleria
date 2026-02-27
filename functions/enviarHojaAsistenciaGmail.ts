import nodemailer from 'nodemailer';
import * as validator from 'validator';
import * as sanitizeHtml from 'sanitize-html';
import { RateLimiter } from '../utils/rateLimit.ts';

const MAX_RETRIES = 3;

// 5 email sends per minute per user
const emailLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 });

interface User {
    email: string;
    role: string;
    id?: string;
}

function validateEmail(email: string): boolean {
    return validator.isEmail(email);
}

function checkRBAC(user: User, requiredRole: string): boolean {
    return user.role === requiredRole;
}

async function sendEmail(to: string, subject: string, html: string) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        html,
    });
}

async function enviarHojaAsistenciaGmail(user: User, subject: string, rawHtml: string) {
    if (!validateEmail(user.email)) {
        throw new Error('Invalid email address');
    }

    if (!checkRBAC(user, 'admin')) {
        throw new Error('Permission denied: insufficient role');
    }

    // Use user.id as rate limit key; fall back to email only when id is absent
    // (e.g. legacy callers). Note: email-based keys are less secure than ID-based
    // ones because email addresses can differ per account, but are still preferable
    // to no rate limiting.
    const rateLimitKey = user.id ?? user.email;
    const rateLimitResult = emailLimiter.check(rateLimitKey);
    if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded. Please retry after ${rateLimitResult.retryAfter} seconds.`);
    }

    const sanitizedHtml = sanitizeHtml(rawHtml);

    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            await sendEmail(user.email, subject, sanitizedHtml);
            console.log('Email sent successfully');
            return;
        } catch (error) {
            console.error('Error sending email:', error);
            retries++;
            if (retries >= MAX_RETRIES) {
                throw new Error('Failed to send email after multiple attempts');
            }
        }
    }
}

export default enviarHojaAsistenciaGmail;
