import { NextResponse } from 'next/server';

export async function POST() {
  return new NextResponse('Mock PDF content', {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report.pdf"`,
    },
  });
} 