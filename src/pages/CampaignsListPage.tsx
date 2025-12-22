import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, X, Filter, ArrowLeft } from 'lucide-react';
import { supabase, Campaign, Category } from '../lib/supabase';
import CampaignCard from '../components/CampaignCard';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { createSlug } from '../utils/slug';
import { CampaignsListPageSkeleton } from '../components/SkeletonLoader';
import { usePageTitle } from '../hooks/usePageTitle';

const CAMPAIGNS_PER_PAGE = 10;

export default function CampaignsListPage() {
  usePageTitle('Daftar Campaign');
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);
  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset and fetch campaigns when search or category changes
  useEffect(() => {
    setPage(0);
    setCampaigns([]);
    setHasMore(true);
    fetchCampaigns(0, true);
  }, [debouncedSearchQuery, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
      } else {
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchCampaigns = async (pageNum: number, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = pageNum * CAMPAIGNS_PER_PAGE;
      const to = from + CAMPAIGNS_PER_PAGE - 1;

      let query = supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'published');

      // Apply category filter
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      // Apply search filter (search in title and description)
      if (debouncedSearchQuery.trim()) {
        query = query.or(`title.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching campaigns:', error);

        // If RLS policy issue, try alternative query
        if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
          console.warn('RLS policy issue detected. Trying alternative query...');

          // Try alternative query with filters
          let altQuery = supabase
            .from('campaigns')
            .select('*');

          if (selectedCategory) {
            altQuery = altQuery.eq('category_id', selectedCategory);
          }

          if (debouncedSearchQuery.trim()) {
            altQuery = altQuery.or(`title.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`);
          }

          const { data: allData, error: allError } = await altQuery
            .order('created_at', { ascending: false })
            .range(from, to);

          if (!allError && allData) {
            const publishedCampaigns = allData.filter(c => c.status === 'published');
            handleCampaignsData(publishedCampaigns, isInitial);
            return;
          }
        }

        if (isInitial) {
          setCampaigns([]);
        }
        setHasMore(false);
        return;
      }

      handleCampaignsData(data || [], isInitial);
    } catch (error) {
      console.error('Error:', error);
      if (isInitial) {
        setCampaigns([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCampaignsData = (newCampaigns: Campaign[], isInitial: boolean) => {
    if (isInitial) {
      setCampaigns(newCampaigns);
    } else {
      setCampaigns(prev => [...prev, ...newCampaigns]);
    }

    // Check if there are more campaigns to load
    if (newCampaigns.length < CAMPAIGNS_PER_PAGE) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;
    setPage(nextPage);
    fetchCampaigns(nextPage, false);
  }, [page, loadingMore, hasMore, debouncedSearchQuery, selectedCategory]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loadMore]);

  const handleCampaignClick = (campaign: Campaign) => {
    // Always use slug from database, fallback to generated slug if not available
    const slug = campaign.slug || createSlug(campaign.title);
    navigate(`/campaign/${slug}`);
  };

  if (loading) {
    return <CampaignsListPageSkeleton />;
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
      <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
        {/* Header - Fixed inside the card */}
        <div className="bg-white sticky top-0 z-10 border-b border-gray-200">
          <div className="px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-800 flex-1">Bantu Siapa Hari Ini?</h1>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          <div className="px-4 py-6">
            {/* Search and Filter */}
            <div className="mb-6">
              <div className="space-y-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari campaign..."
                    className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-lg focus:outline-none text-sm"
                    style={{
                      '--primary-color': primaryColor,
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.target.style.borderColor = primaryColor;
                      e.target.style.boxShadow = `0 0 0 3px ${primaryColor}33`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none text-sm appearance-none bg-white"
                    onFocus={(e) => {
                      e.target.style.borderColor = primaryColor;
                      e.target.style.boxShadow = `0 0 0 3px ${primaryColor}33`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Semua Kategori</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaigns List */}
            {campaigns.length === 0 && !loading ? (
              <div className="text-center py-12">
                {debouncedSearchQuery || selectedCategory ? (
                  <>
                    <p className="text-gray-600 mb-2">Tidak ada campaign ditemukan</p>
                    <p className="text-sm text-gray-500 mb-4">
                      {debouncedSearchQuery && selectedCategory
                        ? `Tidak ada campaign untuk "${debouncedSearchQuery}" dalam kategori yang dipilih`
                        : debouncedSearchQuery
                          ? `Tidak ada campaign untuk "${debouncedSearchQuery}"`
                          : `Tidak ada campaign dalam kategori yang dipilih`}
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('');
                      }}
                      className="font-semibold text-sm transition-colors"
                      style={{ color: primaryColor }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Hapus Filter
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 mb-2">Belum ada campaign yang dipublish</p>
                    <p className="text-sm text-gray-500">
                      Campaign yang sudah dipublish akan muncul di sini
                    </p>
                  </>
                )}
              </div>
            ) : campaigns.length > 0 ? (
              <>
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onClick={handleCampaignClick}
                    />
                  ))}
                </div>

                {/* Infinite Scroll Trigger */}
                {hasMore && (
                  <div ref={observerTarget} className="py-8">
                    {loadingMore && (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />
                        <span className="ml-2 text-gray-600">Memuat campaign...</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
