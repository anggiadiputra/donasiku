import { Plus, Target, Users, Menu, Bell, LogOut, TrendingUp, Wallet } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { SkeletonBox } from '../components/SkeletonLoader';

export default function FundraisingPage() {
  usePageTitle('Fundraising');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();

  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);

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
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);

      // 1. Fetch Real Campaigns from DB
      const { data: campaigns, error: campError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campError) throw campError;

      // 2. Fetch Transactions to calculate Zakat/Infaq/Fidyah/Ziswaf totals
      // We only need product_details and amount for this calculation
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, product_details')
        .eq('status', 'success');

      if (txError) throw txError;

      // Calculate totals for non-campaign programs (Virtual Programs)
      const virtualTotals = {
        'Zakat': 0,
        'Infaq': 0,
        'Fidyah': 0,
        'Wakaf': 0
      };

      transactions?.forEach((tx) => {
        const details = (tx.product_details || '').toLowerCase();
        if (details.includes('zakat')) virtualTotals['Zakat'] += tx.amount;
        else if (details.includes('infaq')) virtualTotals['Infaq'] += tx.amount;
        else if (details.includes('fidyah')) virtualTotals['Fidyah'] += tx.amount;
        else if (details.includes('wakaf')) virtualTotals['Wakaf'] += tx.amount;
      });

      // Construct the list
      const combinedPrograms = [];

      // Add Virtual Programs first (High priority)
      // Only add if they have > 0 amount? Or always show? User asked for these programs explicitly.
      // Let's always show Zakat and Infaq as they are core.

      const virtualIcons: Record<string, any> = { 'Zakat': Wallet, 'Infaq': TrendingUp, 'Fidyah': Users, 'Wakaf': Target };

      Object.entries(virtualTotals).forEach(([key, amount]) => {
        // Should we skip if 0? Maybe keep Zakat/Infaq visible.
        const Icon = virtualIcons[key] || Target;
        combinedPrograms.push({
          id: `virtual-${key}`,
          title: `Program ${key}`,
          category: key,
          current_amount: amount,
          target_amount: null, // Unlimited
          is_virtual: true,
          icon: Icon
        });
      });

      // Add Real Campaigns
      if (campaigns) {
        campaigns.forEach(camp => {
          combinedPrograms.push({
            ...camp,
            is_virtual: false
          });
        });
      }

      setPrograms(combinedPrograms);

    } catch (err) {
      console.error('Error fetching fundraising programs:', err);
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
            <h1 className="text-2xl font-bold text-gray-800">Fundraising</h1>
            <p className="text-sm text-gray-600">Kelola program fundraising (Zakat, Infaq, Donasi)</p>
          </div>

          <button
            onClick={() => navigate('/donasi/campaigns/new')}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 mb-8"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-5 h-5" />
            Buat Program Baru
          </button>

          {/* Active Fundraising */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Semua Program Aktif</h3>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <SkeletonBox className="h-6 w-3/4 mb-2" />
                        <SkeletonBox className="h-4 w-20 rounded-full" />
                      </div>
                      <SkeletonBox className="w-10 h-10 rounded-lg ml-4" />
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <SkeletonBox className="h-4 w-16" />
                          <SkeletonBox className="h-4 w-24" />
                        </div>
                        <SkeletonBox className="h-2 w-full rounded-full" />
                      </div>
                      <div className="pt-4 border-t border-gray-100 flex justify-between">
                        <SkeletonBox className="h-4 w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : programs.length === 0 ? (
              <div className="text-center py-10 text-gray-500">Belum ada program aktif.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-gray-900 line-clamp-1 text-lg mb-1">{item.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.is_virtual ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                          {item.is_virtual ? 'Program Tetap' : 'Campaign'}
                        </span>
                      </div>
                      {item.is_virtual && item.icon ? (
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <item.icon className="w-6 h-6 text-gray-400" />
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Terkumpul</span>
                          <span className="font-bold text-gray-900">{formatCurrency(item.current_amount)}</span>
                        </div>
                        {item.target_amount && (
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min((item.current_amount / item.target_amount) * 100, 100)}%`,
                                backgroundColor: primaryColor || '#F97316'
                              }}
                            ></div>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        {item.target_amount ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Target className="w-4 h-4" />
                            <span>Target: {formatCurrency(item.target_amount)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <TrendingUp className="w-4 h-4" />
                            <span>Unlimited Goal</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
