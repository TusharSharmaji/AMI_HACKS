import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0b1220] text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
        isMobileNavOpen={isMobileNavOpen}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileNavOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileNavOpen(false)}
            />
            <div className="md:hidden">
              <Sidebar
                isMobile
                onCloseMobile={() => setIsMobileNavOpen(false)}
              />
            </div>
          </>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
