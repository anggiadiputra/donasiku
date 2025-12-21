import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase, Campaign } from '../lib/supabase';
import CampaignCard from './CampaignCard';
import { createSlug } from '../utils/slug';
import { CampaignListSkeleton } from './SkeletonLoader';

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

  const fetchCampaigns = async () => {
    try {
      setLoading(true);

      // First, let's check if we can access campaigns at all
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching campaigns:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });

        // If RLS policy issue, try without status filter to see all campaigns
        if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
          console.warn('RLS policy issue detected. Trying alternative query...');

          // Try to fetch all campaigns (this will only work if user is authenticated)
          const { data: allData, error: allError } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

          if (!allError && allData) {
            // Filter published campaigns on client side
            const publishedCampaigns = allData.filter(c => c.status === 'published');
            console.log('Found published campaigns (client-side filter):', publishedCampaigns.length);
            setCampaigns(publishedCampaigns);
            return;
          }
        }

        // If table doesn't exist, show empty state gracefully
        if (error.code === 'PGRST116' || error.message.includes('relation')) {
          console.warn('Campaigns table may not exist');
        }
        setCampaigns([]);
      } else {
        console.log('Successfully fetched campaigns:', data?.length || 0);
        console.log('Campaigns data:', data);
        setCampaigns(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
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
