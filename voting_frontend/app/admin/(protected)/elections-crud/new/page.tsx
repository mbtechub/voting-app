import React from 'react';
import NewElectionClient from './new-election-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NewElectionPage() {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Create Poll</h1>
      <p style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
        Creates a new poll in the backend.
      </p>

      <div style={{ marginTop: 18, maxWidth: 720 }}>
        <NewElectionClient />
      </div>
    </div>
  );
}