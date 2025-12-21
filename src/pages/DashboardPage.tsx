import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  FileText, 
  Settings, 
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">Selamat Datang</h2>
            <p className="text-gray-600">Kelola pembayaran dan tagihan Anda</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Tagihan</p>
              <p className="text-xl font-bold text-gray-800">Rp 2.450.000</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Sudah Dibayar</p>
              <p className="text-xl font-bold text-gray-800">Rp 1.850.000</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-xl font-bold text-gray-800">Rp 600.000</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Donatur</p>
              <p className="text-xl font-bold text-gray-800">1,234</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Menu Utama</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/billing')}
                className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">Billing</p>
                    <p className="text-sm text-gray-600">Kelola tagihan dan pembayaran</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>

              <button className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">Invoice</p>
                    <p className="text-sm text-gray-600">Lihat semua invoice</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>

              <button className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">Pengaturan</p>
                    <p className="text-sm text-gray-600">Kelola akun dan preferensi</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Aktivitas Terbaru</h3>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-800">Pembayaran Berhasil</p>
                    <p className="text-sm text-gray-600">INV-ABC123 - Rp 200.000</p>
                  </div>
                  <span className="text-xs text-green-600 font-semibold">Berhasil</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-800">Tagihan Baru</p>
                    <p className="text-sm text-gray-600">INV-XYZ789 - Rp 500.000</p>
                  </div>
                  <span className="text-xs text-yellow-600 font-semibold">Pending</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">Pembayaran Berhasil</p>
                    <p className="text-sm text-gray-600">INV-DEF456 - Rp 150.000</p>
                  </div>
                  <span className="text-xs text-green-600 font-semibold">Berhasil</span>
                </div>
              </div>
            </div>
          </div>
    </DashboardLayout>
  );
}

