import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { supabase } from './lib/supabase';

// Helper functions for global settings
const adjustColorBrightness = (hex: string, percent: number) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
};

const applyPrimaryColor = (color: string) => {
  document.documentElement.style.setProperty('--primary-color', color);
  const hoverColor = adjustColorBrightness(color, -20);
  document.documentElement.style.setProperty('--primary-color-hover', hoverColor);
};
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import CategoryNav from './components/CategoryNav';
import PromoSlider from './components/PromoSlider';
import CampaignSlider from './components/CampaignSlider';
import CampaignList from './components/CampaignList';
import CTASection from './components/CTASection';
import DonationStats from './components/DonationStats';
import PrayersSection from './components/PrayersSection';
import Footer from './components/Footer';
import DonationForm from './components/DonationForm';
import CampaignPage from './pages/CampaignPage';
import InvoicePage from './pages/InvoicePage';
import PaymentStatusPage from './pages/PaymentStatusPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OTPVerificationPage from './pages/OTPVerificationPage';
import DashboardPage from './pages/DashboardPage';
import BillingPage from './pages/BillingPage';
import DonasiDashboardPage from './pages/DonasiDashboardPage';
import DonationDashboard from './pages/DonationDashboard';
import CampaignsPage from './pages/CampaignsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FundraisingPage from './pages/FundraisingPage';
import SettingsPage from './pages/SettingsPage';
import LayoutSettingsPage from './pages/LayoutSettingsPage';
import FontSettingsPage from './pages/FontSettingsPage';
import AddNewCampaignPage from './pages/AddNewCampaignPage';
import EditCampaignPage from './pages/EditCampaignPage';
import ZakatPage from './pages/ZakatPage';
import ZakatSettingsPage from './pages/ZakatSettingsPage';
import InfaqPage from './pages/InfaqPage';
import InfaqSettingsPage from './pages/InfaqSettingsPage';
import InfaqDonationsPage from './pages/InfaqDonationsPage';
import FidyahPage from './pages/FidyahPage';
import FidyahSettingsPage from './pages/FidyahSettingsPage';
import FidyahDonationsPage from './pages/FidyahDonationsPage';
import ZiswafPage from './pages/ZiswafPage';
import WhatsAppMessagesPage from './pages/WhatsAppMessagesPage';
import DonatursPage from './pages/DonatursPage';
import CampaignersPage from './pages/CampaignersPage';
import PrayersPage from './pages/PrayersPage';
import CampaignsListPage from './pages/CampaignsListPage';
import CampaignDonorsPage from './pages/CampaignDonorsPage';
import CampaignPrayersPage from './pages/CampaignPrayersPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import ThemeProvider from './components/ThemeProvider';
import WhatsAppFloatingButton from './components/WhatsAppFloatingButton';
import AnalyticsScripts from './components/AnalyticsScripts';
import CreateOrganizationPage from './pages/organizations/CreateOrganizationPage';
import OrganizationSettingsPage from './pages/organizations/OrganizationSettingsPage';
import OrganizationProfilePage from './pages/organizations/OrganizationProfilePage';
import OrganizationExplorePage from './pages/organizations/OrganizationExplorePage';
import ProfilePage from './pages/ProfilePage';

import { usePageTitle } from './hooks/usePageTitle';
import { useAppName } from './hooks/useAppName';
import { OrganizationProvider } from './context/OrganizationContext';

function HomePage() {
  const { appName, tagline } = useAppName();
  usePageTitle(appName, tagline ? ` - ${tagline}` : '');
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header />
      <HeroBanner />
      <CategoryNav />
      <PromoSlider />
      <CampaignSlider />
      <CampaignList />
      <CTASection />
      <CampaignSlider variant="secondary" />
      <PrayersSection />
      <DonationStats />
      <Footer />
    </div>
  );
}

function AppContent() {
  // Load global settings
  useEffect(() => {
    // 1. Load from localStorage (Instant)
    const savedFontSettings = localStorage.getItem('fontSettings');
    const savedPrimaryColor = localStorage.getItem('primaryColor');

    if (savedFontSettings) {
      try {
        const parsed = JSON.parse(savedFontSettings);
        document.documentElement.style.setProperty('--font-family', parsed.fontFamily);
        document.documentElement.style.setProperty('--font-size-base', `${parsed.fontSize}px`);
        document.documentElement.style.setProperty('--font-weight-normal', parsed.fontWeight.toString());
      } catch (e) {
        console.error('Error loading font settings:', e);
      }
    }

    if (savedPrimaryColor) {
      applyPrimaryColor(savedPrimaryColor);
    }

    // 2. Sync with Database
    const fetchGlobalSettings = async () => {
      try {
        const { data } = await supabase.from('app_settings').select('primary_color').single();
        if (data && data.primary_color) {
          if (data.primary_color !== savedPrimaryColor) {
            localStorage.setItem('primaryColor', data.primary_color);
            applyPrimaryColor(data.primary_color);
          }
        }
      } catch (error) {
        console.error('Error fetching global settings:', error);
      }
    };

    fetchGlobalSettings();
  }, []);



  const location = useLocation();

  // Define routes that should NOT be constrained to mobile width (Dashboard/Admin)
  const isDashboardRoute =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/billing') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/donasi/') ||
    location.pathname.startsWith('/payment/status') || // Often redirected from gateway, easier to read if full width? Or keep mobile? Keeping full for consistency with dashboard usually, but let's stick to strict admin definition. Actually payment status might be public. Let's stick to clear admin paths.
    location.pathname.startsWith('/zakat/settings') ||
    location.pathname.startsWith('/infaq/settings') ||
    location.pathname.startsWith('/fidyah/settings') ||
    location.pathname.startsWith('/fidyah/settings') ||
    location.pathname.startsWith('/font/settings') ||
    location.pathname.startsWith('/organizations/');

  const content = (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/org/:slug/explore" element={<OrganizationExplorePage />} />
      <Route path="/org/:slug" element={<OrganizationProfilePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/otp-verification" element={<OTPVerificationPage />} />
      <Route path="/donasi" element={<DonationForm />} />
      <Route path="/transactions" element={<DonationDashboard />} />
      <Route path="/campaign" element={<CampaignsListPage />} />
      <Route path="/campaign/:slug" element={<CampaignPage />} />
      <Route path="/campaign/:slug/donatur" element={<CampaignDonorsPage />} />
      <Route path="/campaign/:slug/doa" element={<CampaignPrayersPage />} />
      <Route path="/campaign/:slug/donasi-amount" element={<DonationForm />} />
      <Route path="/campaign/:slug/invoice/:invoiceCode" element={<InvoicePage />} />
      <Route path="/invoice/:invoiceCode" element={<InvoicePage />} />
      <Route path="/payment/status" element={<PaymentStatusPage />} />
      <Route path="/payment/success" element={<PaymentStatusPage />} />
      <Route path="/payment/failed" element={<PaymentStatusPage />} />
      <Route path="/zakat" element={<ZakatPage />} />
      <Route path="/infaq" element={<InfaqPage />} />
      <Route path="/infaq/bayar" element={<DonationForm />} />
      <Route path="/infaq/donasi" element={<InfaqDonationsPage />} />
      <Route path="/fidyah" element={<FidyahPage />} />
      <Route path="/fidyah/bayar" element={<DonationForm />} />
      <Route path="/fidyah/donasi" element={<FidyahDonationsPage />} />
      <Route path="/ziswaf" element={<ZiswafPage />} />
      <Route path="/prayers" element={<PrayersPage />} />

      {/* Dashboard Routes - Wrapped in ProtectedRoute */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <BillingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donasi/dashboard"
        element={
          <ProtectedRoute>
            <DonasiDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donasi/campaigns"
        element={
          <ProtectedRoute>
            <CampaignsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donasi/donaturs"
        element={
          <ProtectedRoute>
            <DonatursPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donasi/campaigners"
        element={
          <ProtectedRoute>
            <CampaignersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donasi/campaigns/new"
        element={
          <ProtectedRoute>
            <AddNewCampaignPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donasi/campaigns/edit/:id"
        element={
          <ProtectedRoute>
            <EditCampaignPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donasi/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donasi/fundraising"
        element={
          <ProtectedRoute>
            <FundraisingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donasi/settings"
        element={
          <ProtectedRoute>
            <LayoutSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/messages"
        element={
          <ProtectedRoute>
            <WhatsAppMessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/zakat/settings"
        element={
          <ProtectedRoute>
            <ZakatSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/infaq/settings"
        element={
          <ProtectedRoute>
            <InfaqSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fidyah/settings"
        element={
          <ProtectedRoute>
            <FidyahSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/font/settings"
        element={
          <ProtectedRoute>
            <FontSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/new"
        element={
          <ProtectedRoute>
            <CreateOrganizationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/settings"
        element={
          <ProtectedRoute>
            <OrganizationSettingsPage />
          </ProtectedRoute>
        }
      />

      {/* 404 Page (Catch All) */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );

  if (isDashboardRoute) {
    return (
      <div className="min-h-screen bg-gray-50">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-[480px] mx-auto bg-white shadow-2xl min-h-screen relative">
        {content}
        {!isDashboardRoute && <WhatsAppFloatingButton />}
      </div>
    </div>
  );

}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <OrganizationProvider>
          <Toaster position="top-center" richColors />
          <AnalyticsScripts />
          <AppContent />
        </OrganizationProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
