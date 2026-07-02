export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bgLight">
      {/* Navbar */}
      <nav className="bg-bgDark px-6 py-4">
        <span className="font-display text-2xl text-primary">eMealia</span>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
