import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from './store';
import ClientLayout from './layouts/ClientLayout';
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import ScrollToTop from './components/ScrollToTop';

// Lazy loading customer pages
const Home = lazy(() => import('./pages/Home'));
const Packages = lazy(() => import('./pages/Packages'));
const PackageDetail = lazy(() => import('./pages/PackageDetail'));
const Compare = lazy(() => import('./pages/Compare'));
const Survey = lazy(() => import('./pages/Survey'));
const Profile = lazy(() => import('./pages/Profile'));
const ChatbotPage = lazy(() => import('./pages/ChatbotPage'));
const Contact = lazy(() => import('./pages/Contact'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

// Lazy loading auth pages
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));

// Lazy loading admin pages
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));
const AdminPackages = lazy(() => import('./pages/Admin/Packages'));
const AdminUsers = lazy(() => import('./pages/Admin/Users'));
const AdminDeposits = lazy(() => import('./pages/Admin/Deposits'));
const AdminContacts = lazy(() => import('./pages/Admin/Contacts'));
const AdminSurveys = lazy(() => import('./pages/Admin/Surveys'));
const AdminChatHistory = lazy(() => import('./pages/Admin/ChatHistory'));
const AdminAnalytics = lazy(() => import('./pages/Admin/Analytics'));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] text-xs font-semibold text-slate-500 space-y-4">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
    <span className="animate-pulse">Đang tải trang...</span>
  </div>
);

export default function App() {
  const { fetchMe, authChecked } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      const newGuestSessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('guest_session_id', newGuestSessionId);
    }
    fetchMe();
  }, [fetchMe]);

  if (!authChecked) {
    return <PageLoader />;
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Customer Routing */}
          <Route path="/" element={<ClientLayout />}>
            <Route index element={<Home />} />
            <Route path="packages" element={<Packages />} />
            <Route path="goi-cuoc" element={<Packages />} />
            <Route path="goi-cuoc/:ma_goi" element={<PackageDetail />} />
            <Route path="compare" element={<Compare />} />
            <Route path="survey" element={<Survey />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/deposit" element={<Profile />} />
            <Route path="profile/subscriptions" element={<Profile />} />
            <Route path="profile/subscription-history" element={<Profile />} />
            <Route path="profile/history" element={<Profile />} />
            <Route path="profile/change-password" element={<Profile />} />
            <Route path="chatbot" element={<ChatbotPage />} />
            <Route path="contact" element={<Contact />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
          </Route>

          {/* Auth Routing */}
          <Route path="/" element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Admin Routing */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="deposits" element={<AdminDeposits />} />
            <Route path="contacts" element={<AdminContacts />} />
            <Route path="surveys" element={<AdminSurveys />} />
            <Route path="chatbot" element={<AdminChatHistory />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>

          {/* Fallback 404 Route */}
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center text-xs font-semibold">
                <h1 className="text-4xl font-extrabold text-primary mb-2">404</h1>
                <p className="text-slate-500 text-xs mb-6 font-semibold">Trang web bạn yêu cầu không tồn tại.</p>
                <a
                  href="/"
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  Về trang chủ
                </a>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
