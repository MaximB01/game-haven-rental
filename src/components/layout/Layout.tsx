import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useTicketNotifications } from '@/hooks/useTicketNotifications';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  // Initialize ticket notifications for staff users
  useTicketNotifications();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
