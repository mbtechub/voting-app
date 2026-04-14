import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DebugPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  return (
    <div style={{ padding: 24 }}>
      <h1>Protected Debug</h1>
      <p>admin_token present: {token ? 'YES' : 'NO'}</p>
      <p>admin_token length: {token ? token.length : 0}</p>
    </div>
  );
}
