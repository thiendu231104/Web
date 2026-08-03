import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CompareDrawer from '../components/CompareDrawer';
import DevTimeWidget from '../components/DevTimeWidget';
import Chatbot from '../components/Chatbot';

export default function ClientLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
      <CompareDrawer />
      <DevTimeWidget />
      <Chatbot />
    </div>
  );
}
