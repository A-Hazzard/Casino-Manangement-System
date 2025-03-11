import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json({ success: true });
    response.cookies.set('token', '', { maxAge: -1, path: '/' }); // Delete the cookie
    return response;
}
