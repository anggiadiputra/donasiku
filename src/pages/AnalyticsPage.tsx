import { TrendingUp, DollarSign, Users, Menu, Bell, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { SkeletonBox } from '../components/SkeletonLoader';
import { useOrganization } from '../context/OrganizationContext';

export default function AnalyticsPage() {
  usePageTitle('Analytics');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const { selectedOrganization } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);
  const [summary, setSummary] = useState({
    totalDonation: 0,
    totalDonors: 0,
    avgDonation: 0,
    conversionRate: 0 // Placeholder or computed
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [topCampaigns, setTopCampaigns] = useState<any[]>([]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    fetchAnalytics();
    const timer = setTimeout(() => setChartReady(true), 500);
    return () => clearTimeout(timer);
  }, [selectedOrganization?.id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch successful transactions
      let query = supabase
        .from('transactions')
        .select('amount, created_at, customer_email, customer_phone, campaign_id, product_details, campaigns!inner(title, user_id, organization_id)')
        .eq('status', 'success');

      if (selectedOrganization) {
        query = query.eq('campaigns.organization_id', selectedOrganization.id);
      } else {
        // Personal context
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profile?.role !== 'admin') {
            query = query.eq('campaigns.user_id', user.id);
          }
        }
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      if (!transactions) {
        setLoading(false);
        return;
      }

      // 1. Summary Stats
      const totalDonation = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const uniqueDonors = new Set(transactions.map(tx => tx.customer_email || tx.customer_phone || Math.random().toString())).size;
      const avgDonation = transactions.length > 0 ? totalDonation / transactions.length : 0;

      setSummary({
        totalDonation,
        totalDonors: uniqueDonors,
        avgDonation,
        conversionRate: 0 // Hard to calc without view tracking
      });

      // 2. Monthly Trend (Last 12 Months)
      const now = new Date();
      const monthMap = new Map();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        monthMap.set(monthStr, 0);
      }

      transactions.forEach(tx => {
        const d = new Date(tx.created_at);
        // Only include if within the generated range (simple check: if map has key)
        const monthStr = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        if (monthMap.has(monthStr)) {
          monthMap.set(monthStr, monthMap.get(monthStr) + tx.amount);
        }
      });

      const chartData = Array.from(monthMap, ([name, value]) => ({ name, value }));
      setTrendData(chartData);

      // 3. Top Campaigns / Programs
      const programMap = new Map();
      let maxAmount = 0;

      transactions.forEach((tx: any) => {
        let name = 'Umum';
        if (tx.campaigns?.title) {
          name = tx.campaigns.title;
        } else if (tx.product_details) {
          // Try to categorize Zakat/Infaq
          const details = tx.product_details.toLowerCase();
          if (details.includes('zakat')) name = 'Zakat';
          else if (details.includes('infaq')) name = 'Infaq';
          else if (details.includes('fidyah')) name = 'Fidyah';
          else name = tx.product_details;
        }

        const current = (programMap.get(name) || 0) + tx.amount;
        programMap.set(name, current);
        if (current > maxAmount) maxAmount = current;
      });

      const top = Array.from(programMap, ([name, amount]) => ({
        name,
        amount,
        progress: maxAmount > 0 ? Math.round((amount / maxAmount) * 100) : 0
      }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      setTopCampaigns(top);

    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 md:ml-0 transition-all duration-300">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
            <p className="text-sm text-gray-600">Analisis performa donasi dan campaign (Data Real)</p>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Donasi</p>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-800">{loading ? <SkeletonBox className="h-8 w-32" /> : formatCurrency(summary.totalDonation)}</div>
              <p className="text-xs text-gray-500 mt-1">Total donasi terkumpul</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Donatur Aktif</p>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-800">{loading ? <SkeletonBox className="h-8 w-24" /> : summary.totalDonors}</div>
              <p className="text-xs text-gray-500 mt-1">Total donatur unik</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Rata-rata Donasi</p>
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-800">{loading ? <SkeletonBox className="h-8 w-32" /> : formatCurrency(summary.avgDonation)}</div>
              <p className="text-xs text-gray-500 mt-1">Per transaksi</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Donasi per Bulan (1 Tahun Terakhir)</h3>
              <div className="h-64 relative overflow-hidden" style={{ minHeight: '256px' }}>
                {!chartReady ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="animate-pulse">Loading chart...</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={256} minWidth={0}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                      <Tooltip formatter={(value: any) => [formatCurrency(value as number), 'Donasi']} />
                      <Bar dataKey="value" fill={primaryColor || "#F97316"} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Top Program & Campaign</h3>
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <SkeletonBox className="h-4 w-32" />
                          <SkeletonBox className="h-4 w-20" />
                        </div>
                        <SkeletonBox className="w-full h-2 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : topCampaigns.length === 0 ? (
                  <p className="text-center text-gray-500">Belum ada data</p>
                ) : (
                  topCampaigns.map((camp, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{camp.name}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(camp.amount)}</p>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${camp.progress}%`, backgroundColor: primaryColor || '#F97316' }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
