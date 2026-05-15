import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendBase } from './env';

export async function proxyToBackend(
  path: string,
  req: Request,
  options?: {
    requireAdmin?: boolean;
  },
) {
  try {
    const token =
      (await cookies()).get(
        'admin_token',
      )?.value;

    if (
      options?.requireAdmin &&
      !token
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'NO_ADMIN_TOKEN_COOKIE',
        },
        {
          status: 401,
        },
      );
    }

    const incomingUrl =
      new URL(req.url);

    const qs =
      incomingUrl.search;

    const targetUrl =
      `${backendBase}${path}${qs}`;

    const contentType =
      req.headers.get(
        'content-type',
      ) || '';

    let body:
      | string
      | FormData
      | undefined =
      undefined;

    const headers: Record<
      string,
      string
    > = {};

    // ✅ AUTH
    if (token) {
      headers[
        'Authorization'
      ] =
        `Bearer ${token}`;
    }

    // ==========================
    // BODY HANDLING
    // ==========================

    if (
      req.method !== 'GET' &&
      req.method !== 'HEAD' &&
      req.method !== 'DELETE'
    ) {
      if (
        contentType.includes(
          'multipart/form-data',
        )
      ) {
        body =
          await req.formData();
      } else {
        body =
          await req.text();

        headers[
          'Content-Type'
        ] =
          'application/json';
      }
    }

    const backendRes =
      await fetch(
        targetUrl,
        {
          method:
            req.method,

          headers,

          body,

          cache:
            'no-store',
        },
      );

    // ===================================
    // 🔥 FILE DOWNLOADS (CSV/XLSX/PDF)
    // ===================================

    const responseType =
      backendRes.headers.get(
        'content-type',
      ) || '';

    const disposition =
      backendRes.headers.get(
        'content-disposition',
      );

    const isFile =
      disposition?.includes(
        'attachment',
      ) ||
      responseType.includes(
        'text/csv',
      ) ||
      responseType.includes(
        'application/pdf',
      ) ||
      responseType.includes(
        'spreadsheet',
      );

    if (isFile) {
      const buffer =
        await backendRes.arrayBuffer();

      return new Response(
        buffer,
        {
          status:
            backendRes.status,

          headers: {
            'Content-Type':
              responseType,

            'Content-Disposition':
              disposition ||
              '',

            'Cache-Control':
              'no-store',
          },
        },
      );
    }

    // ===================================
    // NORMAL JSON RESPONSE
    // ===================================

    const text =
      await backendRes.text();

    let data: any =
      {};

    try {
      data = text
        ? JSON.parse(
            text,
          )
        : {};
    } catch {
      data = {
        message:
          text ||
          'Invalid JSON from backend',
      };
    }

    return NextResponse.json(
      data,
      {
        status:
          backendRes.status,
      },
    );
  } catch (
    err: any
  ) {
    return NextResponse.json(
      {
        ok: false,

        error:
          err?.message ||
          'PROXY_ERROR',
      },
      {
        status: 500,
      },
    );
  }
}

export async function proxyAdminGet(
  path: string,
) {
  return proxyToBackend(
    path,

    new Request(
      'http://localhost',
      {
        method: 'GET',
      },
    ),

    {
      requireAdmin: true,
    },
  );
}