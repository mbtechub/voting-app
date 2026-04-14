import React from 'react';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      {/* Header */}
      <PublicHeader />

      {/* Page Content */}
      <main className="flex-1 w-full">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}