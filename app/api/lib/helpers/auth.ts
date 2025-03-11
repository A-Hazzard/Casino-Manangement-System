import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getUserByEmail } from './users';
import { sendEmail } from '../../lib/utils/email';
import { User } from '@/app/api/lib/types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export async function authenticateUser(email: string, password: string) {
    const user: User | null = await getUserByEmail(email);
    if (!user) return { success: false, message: 'User not found.' };

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return { success: false, message: 'Incorrect password.' };

    const token = await new SignJWT({ userId: user._id, email: user.emailAddress })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET));

    return { success: true, token };
}

export async function sendResetPasswordEmail(email: string) {
    const user: User | null = await getUserByEmail(email);
    if (!user) {
        return { success: false, message: 'User not found.' };
    }

    const resetToken = await new SignJWT({ userId: user._id })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('15m')
        .sign(new TextEncoder().encode(JWT_SECRET));

    const resetUrl = `/reset-password?token=${resetToken}`;

    const subject = 'Password Reset Instructions';
    const text = `Reset your password using the following link: ${resetUrl}`;
    const html = `<p>Please click <a href="${resetUrl}">here</a> to reset your password.</p>`;

    const emailResult = await sendEmail(email, subject, text, html);
    if (emailResult.success) {
        return { success: true };
    } else {
        return { success: false, message: 'Failed to send email.' };
    }
}
