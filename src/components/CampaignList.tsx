import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase, Campaign } from '../lib/supabase';
import CampaignCard from './CampaignCard';
import { createSlug } from '../utils/slug';
import { CampaignListSkeleton } from './SkeletonLoader';
import { isNetworkError, isDatabaseRelationshipError } from '../utils/errorHandling';

interface CampaignListProps {
  onCampaignClick?: (campaign: Campaign) => void;
}

export default function CampaignList({ onCampaignClick }: CampaignListProps) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async (retryCount = 0) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('campaigns')
        .select('*, profiles:user_id(full_name, organization_name, avatar_url)')
        .eq('status', 'published')
        .not('slug', 'in', '("infaq","fidyah","zakat","wakaf","sedekah-subuh","kemanusiaan")')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Campaign fetching error:', error);

        // 1. Handle Network Errors with limited retry
        if (isNetworkError(error) && retryCount < 2) {
          console.warn(`Network issue, retrying (${retryCount + 1})...`);
          setTimeout(() => fetchCampaigns(retryCount + 1), 2000);
          return;
        }

        // 2. Handle Relationship/Permission Errors with Fallback
        if (isDatabaseRelationshipError(error) || isNetworkError(error)) {
          console.warn('Attempting fallback query due to fetching issue...');

          const { data: allData, error: allError } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

          if (!allError && allData) {
            setCampaigns(allData.filter(c => c.status === 'published' && !["infaq", "fidyah", "zakat", "wakaf", "sedekah-subuh", "kemanusiaan"].includes(c.slug || '')));
            return;
          }
        }

        setCampaigns([]);
      } else {
        setCampaigns(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      // Handle generic fetch/TypeError
      if (isNetworkError(err) && retryCount < 2) {
        setTimeout(() => fetchCampaigns(retryCount + 1), 2000);
        return;
      }
      setCampaigns([]);
    } finally {
      if (retryCount === 0 || !loading) {
        setLoading(false);
      }
    }
  };

  const handleCampaignClick = (campaign: Campaign) => {
    // Navigate directly to campaign page with slug
    const slug = campaign.slug || createSlug(campaign.title);
    navigate(`/campaign/${slug}`);
    onCampaignClick?.(campaign);
  };

  if (loading) {
    return (
      <div className="w-full max-w-[480px] mx-auto px-4 py-4">
        <div className="mb-4">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <CampaignListSkeleton count={3} />
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-[480px] mx-auto px-4 py-4">
        <div className="mb-4">
          <span className="inline-block bg-orange-500 text-white px-3 py-1 rounded text-xs font-bold">
            REKOMENDASI
          </span>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-2">Belum ada campaign yang dipublish</p>
            <p className="text-sm text-gray-500">
              Campaign yang sudah dipublish akan muncul di sini
            </p>
          </div>
        ) : (
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

            <div className="text-center mt-6">
              <button
                onClick={() => navigate('/campaign')}
                className="bg-blue-50 text-blue-700 px-6 py-3 rounded-lg font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2 mx-auto"
              >
                <span>Lihat semua</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
