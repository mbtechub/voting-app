import { cookies } from 'next/headers';

export async function getAdminTokenOrThrow() {
  const token = (await cookies()).get('admin_token')?.value;
  if (!token) {
    const err: any = new Error('NO_ADMIN_TOKEN_COOKIE');
    err.status = 401;
    throw err;
  }
  return token;
}
