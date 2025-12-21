import { useState } from 'react';
import { CreditCard, Calendar, Search, CheckCircle, Clock, XCircle } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

interface Bill {
  id: string;
  invoiceCode: string;
  campaign: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  dueDate: string;
  paidDate?: string;
}

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

  // Mock data
  const bills: Bill[] = [
    {
      id: '1',
      invoiceCode: 'INV-ABC123',
      campaign: 'Bantu Penuh Kebutuhan Tumbuh Kembang Bayi Terlantar',
      amount: 200000,
      status: 'paid',
      dueDate: '2024-12-01',
      paidDate: '2024-11-28',
    },
    {
      id: '2',
      invoiceCode: 'INV-XYZ789',
      campaign: 'Bantu Penuhi Popok Untuk Adik-Adik RAnS',
      amount: 500000,
      status: 'pending',
      dueDate: '2024-12-05',
    },
    {
      id: '3',
      invoiceCode: 'INV-DEF456',
      campaign: 'Sedekah Pampers',
      amount: 150000,
      status: 'paid',
      dueDate: '2024-11-25',
      paidDate: '2024-11-24',
    },
    {
      id: '4',
      invoiceCode: 'INV-GHI789',
      campaign: 'Bantuan Makanan untuk Anak Yatim',
      amount: 300000,
      status: 'failed',
      dueDate: '2024-11-20',
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Lunas
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
            <XCircle className="w-3 h-3" />
            Gagal
          </span>
        );
      default:
        return null;
    }
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch = bill.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bill.invoiceCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || bill.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Billing</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari invoice atau campaign..."
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {(['all', 'paid', 'pending', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                filterStatus === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Semua' : status === 'paid' ? 'Lunas' : status === 'pending' ? 'Pending' : 'Gagal'}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-center">
            <p className="text-xs text-gray-600 mb-1">Total</p>
            <p className="text-lg font-bold text-gray-800">{bills.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-center">
            <p className="text-xs text-gray-600 mb-1">Lunas</p>
            <p className="text-lg font-bold text-green-600">
              {bills.filter(b => b.status === 'paid').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-center">
            <p className="text-xs text-gray-600 mb-1">Pending</p>
            <p className="text-lg font-bold text-yellow-600">
              {bills.filter(b => b.status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Bills List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBills.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center md:col-span-2 lg:col-span-3">
              <p className="text-gray-600">Tidak ada tagihan ditemukan</p>
            </div>
          ) : (
            filteredBills.map((bill) => (
              <div
                key={bill.id}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="font-bold text-gray-800">{bill.invoiceCode}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">{bill.campaign}</p>
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(bill.amount)}</p>
                  </div>
                  {getStatusBadge(bill.status)}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Jatuh tempo: {formatDate(bill.dueDate)}</span>
                  </div>
                  {bill.status === 'paid' && bill.paidDate && (
                    <span className="text-xs text-green-600">
                      Dibayar: {formatDate(bill.paidDate)}
                    </span>
                  )}
                </div>

                {bill.status === 'pending' && (
                  <button className="w-full mt-3 bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors">
                    Bayar Sekarang
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

