import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendBase } from '@/lib/env';
import { normalizeRole } from '@/lib/auth/role';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  // 🔒 NO TOKEN → HARD FAIL
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        role: 'UNKNOWN',
        admin: null,
        message: 'NO_ADMIN_TOKEN_COOKIE',
      },
      { status: 401, headers: noStoreHeaders },
    );
  }

  try {
    const res = await fetch(`${backendBase}/api/auth/admin/whoami`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    let raw: any = null;
    try {
      raw = await res.json();
    } catch {
      raw = null;
    }

    // 🔥 STRICT FAILURE (prevents role loop)
    if (!res.ok || !raw) {
      return NextResponse.json(
        {
          ok: false,
          role: 'UNKNOWN',
          admin: null,
          message: 'WHOAMI_FAILED',
        },
        { status: 401, headers: noStoreHeaders },
      );
    }

    // 🔥 ROLE EXTRACTION (ordered + stable)
    const rawRole =
      raw?.role ??
      raw?.admin?.role ??
      raw?.admin?.ROLE ??
      raw?.ROLE;

    const role = normalizeRole(rawRole);

    // 🔥 HARD VALIDATION (CRITICAL)
    if (role === 'UNKNOWN') {
      return NextResponse.json(
        {
          ok: false,
          role: 'UNKNOWN',
          admin: null,
          message: 'INVALID_ROLE',
        },
        { status: 401, headers: noStoreHeaders },
      );
    }

    const stable = {
      ok: true,
      role, // ✅ ALWAYS: ADMIN | SUPER_ADMIN
      admin: raw?.admin
        ? {
            adminId: raw.admin.adminId,
            email: raw.admin.email,
            username: raw.admin.username,
            firstName:
              raw.admin.firstName ??
              raw.admin.first_name ??
              raw.admin.FIRST_NAME ??
              null,
            lastName:
              raw.admin.lastName ??
              raw.admin.last_name ??
              raw.admin.LAST_NAME ??
              null,
            isActive: raw.admin.isActive,
          }
        : null,
    };

    return NextResponse.json(stable, {
      status: 200,
      headers: noStoreHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        role: 'UNKNOWN',
        admin: null,
        message: 'WHOAMI_NETWORK_ERROR',
      },
      { status: 502, headers: noStoreHeaders },
    );
  }
}