import { ReactNode, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageContainer } from './PageContainer';
import { cn } from '@lib/utils';
import { getBreadcrumbs } from '@lib/navigation';

interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { pathname } = useLocation();

  // Close the drawer on Escape (returning focus to the toggle) and lock page scroll while it is open.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        document.getElementById('sidebar-toggle')?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);
  const toggleCollapse = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onToggleCollapse={toggleCollapse}
        isCollapsed={sidebarCollapsed}
      />

      {/* The sidebar is fixed on every breakpoint, so content only reserves space on lg+ */}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200 lg:pl-64',
          sidebarCollapsed && 'lg:pl-20'
        )}
      >
        <Header breadcrumbs={getBreadcrumbs(pathname)} onMenuClick={toggleSidebar} isMenuOpen={sidebarOpen} />

        <main className="flex-1">
          <PageContainer>{children || <Outlet />}</PageContainer>
        </main>
      </div>
    </div>
  );
}
