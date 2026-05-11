import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  BACKEND_BASE_URL,
} from '@/lib/env';

export async function POST(
  req: Request,
) {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        'admin_token',
      )?.value;

    if (!token) {
      return NextResponse.json(
        {
          message:
            'Unauthorized',
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await req.json();

    const backendRes =
      await fetch(
        `${BACKEND_BASE_URL}/api/auth/admin/change-password`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify(
            body,
          ),
        },
      );

    const data =
      await backendRes.json();

    return NextResponse.json(
      data,
      {
        status:
          backendRes.status,
      },
    );
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        message:
          'Internal server error',
      },
      {
        status: 500,
      },
    );
  }
}