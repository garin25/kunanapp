import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

import { expirePendingOrders } from '@/lib/order-reservations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: 'CRON_SECRET no está configurado.' },
      { status: 503 }
    );

  const authorization = request.headers.get('authorization') ?? '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const expired = await expirePendingOrders();
  return NextResponse.json({ expired });
}
