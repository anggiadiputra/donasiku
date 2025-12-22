import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ArrowUpRight, Calendar, Search, Filter, Download,
  ChevronDown, FileText, FileSpreadsheet
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DashboardContentSkeleton } from '../components/SkeletonLoader';
import DashboardLayout from '../components/DashboardLayout';

import { usePrimaryColor } from '../hooks/usePrimaryColor';

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const primaryColor = usePrimaryColor();
  const navigate = useNavigate();

  // State for Data
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalDonation: 0,
    totalDonors: 0,
    avgDonation: 0,
    successRate: 0
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [breakdownData, setBreakdownData] = useState<{ name: string; value: number; color: string; percentage: number }[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Filter States
  const [timeframe, setTimeframe] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [timeframeOpen, setTimeframeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchUserProfile();
  }, [timeframe]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      setUserProfile({ ...user, ...data });
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Determine Date Range
      const now = new Date();
      let startDate = new Date();

      if (timeframe === 'Weekly') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeframe === 'Monthly') {
        startDate.setDate(now.getDate() - 30);
      } else if (timeframe === 'Yearly') {
        startDate.setMonth(now.getMonth() - 11);
        startDate.setDate(1);
      }

      // 1. Fetch Transactions in Range
      let { data: periodTx, error: txError } = await supabase
        .from('transactions')
        .select('amount, created_at, customer_email, customer_phone, product_details')
        .eq('status', 'success')
        .gte('created_at', startDate.toISOString());

      if (txError) throw txError;
      if (!periodTx) periodTx = [];

      // 1b. Fetch All Transactions Count (in period)
      const { count: totalTxPeriodCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      // 3. Fetch Recent Transactions (Always latest 10, regardless of filter for the list view)
      // OR should the list also be filtered? Usually "Recent Transactions" implies absolute latest.
      // Let's keep it as absolute latest for now, or match specific request if needed.
      const { data: recent, error: recentError } = await supabase
        .from('transactions')
        .select('id, amount, status, customer_name, created_at, invoice_code, campaigns(title)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      // --- Calculations ---

      // A. Summary
      const totalDonation = periodTx.reduce((sum, tx) => sum + tx.amount, 0);
      const distinctDonors = new Set(periodTx.map(tx => tx.customer_email || tx.customer_phone || Math.random().toString())).size;
      const avgDonation = periodTx.length > 0 ? totalDonation / periodTx.length : 0;
      const successRate = totalTxPeriodCount ? ((periodTx.length / totalTxPeriodCount) * 100).toFixed(1) : 0;

      setSummary({
        totalDonation,
        totalDonors: distinctDonors,
        avgDonation,
        successRate: Number(successRate)
      });

      // B. Trend Data
      let chartData = [];

      if (timeframe === 'Yearly') {
        // Group by Month
        const monthMap = new Map();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStr = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
          monthMap.set(monthStr, 0);
        }

        periodTx.forEach(tx => {
          const d = new Date(tx.created_at);
          const monthStr = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
          if (monthMap.has(monthStr)) {
            monthMap.set(monthStr, monthMap.get(monthStr) + tx.amount);
          }
        });
        chartData = Array.from(monthMap, ([name, value]) => ({ name, value }));

      } else {
        // Group by Day
        const daysMap = new Map();
        const daysCount = timeframe === 'Weekly' ? 7 : 30;

        for (let i = daysCount - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          daysMap.set(dateStr, 0);
        }

        periodTx.forEach(tx => {
          const d = new Date(tx.created_at);
          const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          if (daysMap.has(dateStr)) {
            daysMap.set(dateStr, daysMap.get(dateStr) + tx.amount);
          }
        });
        chartData = Array.from(daysMap, ([name, value]) => ({ name, value }));
      }


      // Calculate Revenue Breakdown
      const categories: Record<string, { value: number, color: string }> = {
        'Zakat': { value: 0, color: '#10B981' },
        'Infaq': { value: 0, color: '#3B82F6' },
        'Fidyah': { value: 0, color: '#F59E0B' },
        'Donasi': { value: 0, color: primaryColor || '#111827' }
      };

      periodTx.forEach((tx: any) => {
        const details = (tx.product_details || '').toLowerCase();
        if (details.includes('zakat')) categories['Zakat'].value += tx.amount;
        else if (details.includes('infaq')) categories['Infaq'].value += tx.amount;
        else if (details.includes('fidyah')) categories['Fidyah'].value += tx.amount;
        else categories['Donasi'].value += tx.amount;
      });

      const totalRev = Object.values(categories).reduce((acc, curr) => acc + curr.value, 0) || 1;
      const breakdown = Object.entries(categories)
        .map(([name, data]) => ({
          name,
          value: data.value,
          color: data.color,
          percentage: Math.round((data.value / totalRev) * 100)
        }))
        .sort((a, b) => b.value - a.value);

      setBreakdownData(breakdown);
      setTrendData(chartData);
      setRecentTransactions(recent || []);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const handleExportExcel = () => {
    // True Excel (.xlsx) export using SheetJS
    const headers = ['Transaction ID', 'Date', 'Customer Name', 'Amount', 'Status', 'Campaign'];

    // Prepare data rows
    const rows = recentTransactions.map(tx => [
      tx.invoice_code || tx.id,
      new Date(tx.created_at).toLocaleDateString(),
      tx.customer_name || 'Hamba Allah',
      tx.amount,
      tx.status,
      tx.campaigns?.title || 'General'
    ]);

    // Create Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Create Workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    // Generate Excel File
    XLSX.writeFile(workbook, "transactions_report.xlsx");
    setExportOpen(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Transaction Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Table
    const tableColumn = ["ID", "Date", "Customer", "Amount", "Status", "Campaign"];
    const tableRows = recentTransactions.map(tx => [
      tx.invoice_code || (tx.id ? tx.id.substring(0, 8) : '-'),
      new Date(tx.created_at).toLocaleDateString(),
      tx.customer_name || 'Hamba Allah',
      formatCurrency(tx.amount),
      tx.status,
      tx.campaigns?.title || 'General'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
    });

    doc.save("transactions_report.pdf");
    setExportOpen(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardContentSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Toolbar & Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome back, {userProfile?.full_name?.split(' ')[0] || 'User'}</h1>
            <p className="text-sm text-gray-500">Here is your daily update.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              />
            </div>

            {/* Timeframe Dropdown */}
            <div className="relative">
              <button
                onClick={() => setTimeframeOpen(!timeframeOpen)}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{timeframe}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
              {timeframeOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTimeframeOpen(false)}></div>
                  <div className="absolute top-full mt-1 right-0 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    {(['Weekly', 'Monthly', 'Yearly'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          setTimeframe(t);
                          setTimeframeOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${timeframe === t ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-600'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className="flex items-center gap-2 text-white border border-transparent rounded-lg px-3 py-1.5 shadow-sm cursor-pointer transition-colors"
                style={{ backgroundColor: primaryColor || '#111827' }}
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Export</span>
                <ChevronDown className="w-3 h-3 text-gray-300" />
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)}></div>
                  <div className="absolute top-full mt-1 right-0 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={handleExportExcel}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Export Excel
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-red-600" />
                      Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="TOTAL REVENUE"
            value={formatCurrency(summary.totalDonation)}
            trend={timeframe === 'Weekly' ? "vs last week" : timeframe === 'Monthly' ? "vs last month" : "vs last year"}
            trendPositive={true}
            data={[10, 25, 45, 30, 60, 55, 70]}
          />
          <SummaryCard
            title="TOTAL DONORS"
            value={summary.totalDonors.toString()}
            subValue="People"
            trend={timeframe === 'Weekly' ? "vs last week" : timeframe === 'Monthly' ? "vs last month" : "vs last year"}
            trendPositive={true}
            data={[10, 15, 20, 25, 30, 45, 50]}
          />
          <SummaryCard
            title="AVG. DONATION"
            value={formatCurrency(summary.avgDonation)}
            trend={timeframe === 'Weekly' ? "vs last week" : timeframe === 'Monthly' ? "vs last month" : "vs last year"}
            trendPositive={false}
            data={[50, 45, 40, 45, 35, 30, 40]}
          />
          <SummaryCard
            title="CONVERSION RATE"
            value={`${summary.successRate}%`}
            trend={timeframe === 'Weekly' ? "vs last week" : timeframe === 'Monthly' ? "vs last month" : "vs last year"}
            trendPositive={true}
            data={[2, 3, 3.5, 3, 4, 4.5, 5]}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Donation Trend</h3>
                <div className="flex items-end gap-2">
                  <h2 className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalDonation)}</h2>
                  <span className="text-sm text-gray-500 font-medium mb-1">in this period</span>
                </div>
              </div>
              <div className="flex gap-2">
                {(['Weekly', 'Monthly', 'Yearly'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1 text-xs font-medium rounded-full ${timeframe === t ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    style={timeframe === t ? { backgroundColor: primaryColor || '#111827' } : {}}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#F9FAFB' }}
                    formatter={(value: number) => [formatCurrency(value), 'Donasi']}
                  />
                  <Bar
                    dataKey="value"
                    fill={primaryColor || "#111827"}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Revenue Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Revenue Breakdown</h3>
              <Filter className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>

            <div className="space-y-6">
              <div className="text-center py-4">
                <h2 className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalDonation)}</h2>
                <p className="text-xs text-gray-500">Total revenue this period</p>
              </div>

              <div className="space-y-4">
                {breakdownData.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between items-end mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-xs font-medium text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900">{item.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                    <div className="text-right mt-1">
                      <span className="text-[10px] text-gray-500">{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                ))}

                {breakdownData.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-400">Belum ada data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Transactions</h3>
            <button className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1">
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign / Purpose</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{tx.invoice_code || (tx.id ? tx.id.substring(0, 8) : '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-100 to-purple-100 flex items-center justify-center text-xs font-bold text-gray-600 border border-white shadow-sm">
                          {tx.customer_name?.charAt(0) || 'H'}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{tx.customer_name || 'Hamba Allah'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.campaigns?.title || 'General Donation'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.status === 'success' ? 'bg-green-100 text-green-800' :
                        tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {tx.status === 'success' ? 'Success' : tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400 cursor-pointer hover:text-gray-600">
                      ...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentTransactions.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No transactions found</div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

function SummaryCard({ title, value, subValue, trend, trendPositive, data }: any) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between h-[150px]">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            {subValue && <span className="text-xs text-gray-500">{subValue}</span>}
          </div>
        </div>
        {/* Mini Sparkline Chart */}
        <div className="w-[80px] h-[40px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.map((v: any, i: any) => ({ i, v }))}>
              <Line type="monotone" dataKey="v" stroke={trendPositive !== false ? "#10B981" : "#EF4444"} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-auto">
        <div className={`inline-flex items-center gap-1 text-xs font-medium ${trendPositive !== false ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2 py-1 rounded-full`}>
          {trendPositive !== false ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 transform rotate-180" />}
          {trend}
        </div>
      </div>
    </div>
  );
}
