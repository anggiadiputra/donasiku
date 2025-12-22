```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Menu, Bell, LogOut, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import { useAppName } from '../hooks/useAppName';
import { supabase, Campaign } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { TableSkeleton } from '../components/SkeletonLoader';
import { usePageTitle } from '../hooks/usePageTitle';

export default function CampaignsPage() {
  usePageTitle('Data Campaign');
  const navigate = useNavigate();
  const { appName } = useAppName();
  const primaryColor = usePrimaryColor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, entriesPerPage, searchQuery]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      navigate('/login');
    }
  };

  const appInitial = appName.charAt(0).toUpperCase();

  const fetchCampaigns = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('campaigns')
        .select('*', { count: 'exact' });

      if (searchQuery) {
        query = query.or(`title.ilike.% ${ searchQuery }%, description.ilike.% ${ searchQuery }% `);
      }

      const from = (currentPage - 1) * entriesPerPage;
      const to = from + entriesPerPage - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching campaigns:', error);
      } else {
        if (count !== null) setTotalCount(count);

        // Fetch donor counts ONLY for the fetched page
        const campaignsWithDonors = await Promise.all(
          (data || []).map(async (campaign) => {
            const { count } = await supabase
              .from('transactions')
              .select('*', { count: 'exact', head: true })
              .eq('campaign_id', campaign.id)
              .eq('status', 'success');

            const { data: recentDonors } = await supabase
              .from('transactions')
              .select('customer_name')
              .eq('campaign_id', campaign.id)
              .eq('status', 'success')
              .order('created_at', { ascending: false })
              .limit(3);

            return {
              ...campaign,
              donor_count: count || 0,
              recent_donors: recentDonors || []
            };
          })
        );
        setCampaigns(campaignsWithDonors);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const getStatusBadge = (status: string | undefined) => {
    const currentStatus = status || 'draft';
    const statusStyles: Record<string, string> = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
    };

    const statusLabels: Record<string, string> = {
      published: 'BERLANGSUNG',
      draft: 'DRAFT',
      active: 'AKTIF',
      completed: 'SELESAI',
    };

    return (
      <span className={`px - 2 py - 1 text - xs font - semibold rounded ${ statusStyles[currentStatus] || statusStyles.draft } `}>
        {statusLabels[currentStatus] || currentStatus.toUpperCase()}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, totalCount);
  const currentCampaigns = campaigns; // Data is already paginated form DB


  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus campaign "${title}" ? `)) {
      try {
        setLoading(true);

        // 1. Fetch campaign to get image_url
        const { data: campaign, error: fetchError } = await supabase
          .from('campaigns')
          .select('image_url')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Error fetching campaign for deletion:', fetchError);
          // Proceed with deletion anyway if fetch fails, or throw? 
          // Better to try delete record if we can't find it
        }

        // 2. Delete image from storage if exists
        if (campaign?.image_url) {
          try {
            // Extract file path from URL
            // URL format: .../storage/v1/object/public/campaigns/folder/filename.jpg
            // or .../storage/v1/object/public/campaigns/filename.jpg
            const url = new URL(campaign.image_url);
            const pathParts = url.pathname.split('/campaigns/');
            if (pathParts.length > 1) {
              const filePath = pathParts[1]; // content after /campaigns/
              // Decode URI component to handle spaces/special chars if any
              const decodedPath = decodeURIComponent(filePath);


              const { error: storageError } = await supabase
                .storage
                .from('campaigns')
                .remove([decodedPath]);

              if (storageError) {
                console.error('Error deleting image from storage:', storageError);
                // Don't block campaign deletion, just log error
              } else {

              }
            }
          } catch (urlError) {
            console.error('Error parsing image URL:', urlError);
          }
        }

        // 3. Delete campaign record
        const { error } = await supabase
          .from('campaigns')
          .delete()
          .eq('id', id);

        if (error) throw error;

        await fetchCampaigns();
        toast.success('Campaign dan gambarnya berhasil dihapus');
      } catch (error: any) {
        console.error('Error deleting campaign:', error);
        toast.error('Gagal menghapus campaign: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset - y - 0 left - 0 z - 50 w - 64 bg - white transform transition - transform duration - 200 ease -in -out md: transform - none
        ${ sidebarOpen ? 'translate-x-0' : '-translate-x-full' }
`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-0 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30 flex-shrink-0">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-lg md:hidden"
                >
                  <Menu className="w-6 h-6 text-gray-600" />
                </button>
                <div className="flex items-center gap-3 md:hidden">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                    <span className="text-white font-bold text-lg">{appInitial}</span>
                  </div>
                  <h1 className="text-lg font-bold text-gray-800">{appName}</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Bell className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <LogOut className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6 lg:p-8">
          <div className="w-full"> {/* Full Width Container */}
            <div className="space-y-6">
              {/* Header section of the page content */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Data Campaign</h1>
                  <p className="text-gray-600 mt-1">Kelola semua campaign donasi Anda</p>
                </div>
                <button
                  onClick={() => navigate('/donasi/campaigns/new')}
                  className="text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-md w-full sm:w-auto justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus className="w-5 h-5" />
                  Add New Campaign
                </button>
              </div>

              {/* Table Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Controls */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show</span>
                    <select
                      value={entriesPerPage}
                      onChange={(e) => {
                        setEntriesPerPage(Number(e.target.value));
                        setCurrentPage(1); // Reset to first page
                      }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="text-sm text-gray-600">entries</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm text-gray-600 whitespace-nowrap">Search:</span>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1); // Reset page on search
                        }}
                        placeholder="Search campaigns..."
                        className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Cover</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Campaign</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Donatur</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Target</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Terkumpul</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">End Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Campaigner</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loading ? (
                        <TableSkeleton rows={entriesPerPage} columns={9} />
                      ) : currentCampaigns.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-12 text-center text-gray-600">
                            No campaigns found
                          </td>
                        </tr>
                      ) : (
                        currentCampaigns.map((campaign, index) => (
                          <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 text-sm text-gray-600">{startIndex + index + 1}</td>
                            <td className="px-4 py-4 valign-top">
                              <div className="flex flex-col gap-2">
                                <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-200 shadow-sm">
                                  {campaign.image_url && (
                                    <img
                                      src={campaign.image_url}
                                      alt={campaign.title}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="max-w-md">
                                <p className="font-bold text-gray-800 text-sm mb-2 line-clamp-2 hover:text-blue-600 cursor-pointer">{campaign.title}</p>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(campaign.status)}
                                  {campaign.category && (
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded border border-blue-100 uppercase">
                                      {campaign.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {/* @ts-ignore - extended campaign type */}
                                  {campaign.recent_donors?.map((donor: any, i: number) => (
                                    <div
                                      key={i}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white bg-gray-100 text-[10px] font-bold text-gray-600 uppercase"
                                      title={donor.customer_name}
                                    >
                                      {donor.customer_name?.charAt(0) || '?'}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {campaign.donor_count || 0} Donasi
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">
                              {(!campaign.target_amount || campaign.target_amount > 1000000000000) ? 'Rp ∞' : formatCurrency(campaign.target_amount)}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-800 font-medium whitespace-nowrap">
                              {formatCurrency(campaign.current_amount || 0)}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                              {campaign.end_date ? formatDate(campaign.end_date) : '∞'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {campaign.organization_name || 'Rumah Anak Surga'}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => navigate(`/ donasi / campaigns / edit / ${ campaign.id } `)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(campaign.id, campaign.title)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete Campaign"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>


                {/* Pagination */}
                {!loading && currentCampaigns.length > 0 && (
                  <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1} to {endIndex} of {totalCount} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-1.5 text-sm text-white rounded" style={{ backgroundColor: primaryColor }}>
                        {currentPage}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
