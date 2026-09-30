import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f0f2f5] p-3 md:p-4 gap-3 md:gap-4 antialiased">
      {/* Floating Pill Sidebar (Image 1) */}
      <Sidebar />

      {/* Floating Rounded Dashboard Canvas Container (Image 2) */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
        <Header />
        <main className="admin-scrollbar flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-7xl animate-fade-rise">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
