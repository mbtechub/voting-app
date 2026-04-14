import Footer from '@/components/admin/AdminFooter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}