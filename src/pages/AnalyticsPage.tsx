import { TrendingUp, DollarSign, Users, Menu, Bell, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

export default function AnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
                <p className="text-sm text-gray-600">Analisis performa donasi dan campaign</p>
              </div>
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
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Donasi</p>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-800">Rp 15.250.000</p>
              <p className="text-xs text-green-600 mt-1">+12.5% dari bulan lalu</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Donatur Aktif</p>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-800">1,234</p>
              <p className="text-xs text-green-600 mt-1">+8.2% dari bulan lalu</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Rata-rata Donasi</p>
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-800">Rp 123.500</p>
              <p className="text-xs text-red-600 mt-1">-3.1% dari bulan lalu</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-800">3.2%</p>
              <p className="text-xs text-green-600 mt-1">+0.5% dari bulan lalu</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Donasi per Bulan</h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {[65, 80, 45, 90, 70, 85, 95].map((height, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-orange-500 rounded-t"
                      style={{ height: `${height}%` }}
                    ></div>
                    <p className="text-xs text-gray-600 mt-2">Nov</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Top Campaigns</h3>
              <div className="space-y-4">
                {[
                  { name: 'Bantu Bayi Terlantar', amount: 'Rp 5.200.000', progress: 85 },
                  { name: 'Sedekah Pampers', amount: 'Rp 3.800.000', progress: 76 },
                  { name: 'Bantuan Makanan', amount: 'Rp 2.100.000', progress: 42 },
                ].map((campaign, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800">{campaign.name}</p>
                      <p className="text-sm text-gray-600">{campaign.amount}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${campaign.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

