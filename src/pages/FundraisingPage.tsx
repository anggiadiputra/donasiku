import { Plus, Target, Calendar, Users, DollarSign, Menu, Bell, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

export default function FundraisingPage() {
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
                <h1 className="text-2xl font-bold text-gray-800">Fundraising</h1>
                <p className="text-sm text-gray-600">Kelola program fundraising Anda</p>
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
          <button className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Buat Program Baru
          </button>


          {/* Active Fundraising */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Program Aktif</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-800">Program Donasi Rutin</h4>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Aktif</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Target className="w-4 h-4" />
                        <span>Target</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">Rp 10.000.000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>Terkumpul</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">Rp 6.500.000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>Donatur</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">450</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Periode</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">Nov 2024</span>
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Completed Fundraising */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Program Selesai</h3>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-gray-800">Program Bantuan Bulanan</p>
                      <p className="text-sm text-gray-600">Okt 2024 - Target tercapai 100%</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">Selesai</span>
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

