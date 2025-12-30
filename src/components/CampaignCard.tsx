import { useNavigate } from 'react-router-dom';
import { CheckCircle, Flame } from 'lucide-react';
import { Campaign } from '../lib/supabase';
import { createSlug } from '../utils/slug';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

interface CampaignCardProps {
  campaign: Campaign;
  onClick?: (campaign: Campaign) => void;
}

export default function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();

  const handleCardClick = () => {
    if (onClick) {
      onClick(campaign);
    } else {
      // Always use slug from database, fallback to generated slug if not available
      const slug = campaign.slug || createSlug(campaign.title);
      navigate(`/campaign/${slug}`);
    }
  };

  const formatCurrency = (amount: number) => {
    // Format without "Rp" prefix, just numbers with dots
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate days remaining (default to 30 days if no end date)
  const calculateDaysRemaining = () => {
    if (campaign.end_date) {
      const endDate = new Date(campaign.end_date);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    }

    // If no end_date, calculate from created_at + 30 days
    const createdDate = new Date(campaign.created_at);
    const endDate = new Date(createdDate);
    endDate.setDate(endDate.getDate() + 30); // Default 30 days
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysRemaining = calculateDaysRemaining();

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer w-full flex"
    >
      {/* Image on left - horizontal layout */}
      <div className="relative w-32 h-32 flex-shrink-0">
        {campaign.image_url ? (
          <img
            src={campaign.image_url}
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}
        {campaign.is_featured && (
          <div
            className="absolute top-1 right-1 text-white p-1 rounded-full shadow-lg z-10 flex items-center justify-center animate-pulse"
            style={{ backgroundColor: '#FF4D4D' }}
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
          </div>
        )}
        {campaign.is_urgent && (
          <div
            className="absolute top-1 left-1 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            SEDEKAH
          </div>
        )}
      </div>

      {/* Content on right */}
      <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-xs text-gray-700 truncate">
              {/* @ts-ignore */}
              {campaign.organizations?.name || campaign.profiles?.organization_name || campaign.profiles?.full_name || campaign.organization_name || 'Donasiku'}
            </span>
            {campaign.is_verified && (
              <CheckCircle className="w-3 h-3 text-white flex-shrink-0" style={{ fill: primaryColor }} />
            )}
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{
                backgroundColor: `${primaryColor}20`,
                color: primaryColor
              }}
            >
              ORG
            </span>
          </div>

          <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 text-sm leading-tight">
            {campaign.title}
          </h3>
        </div>

        {/* Stats at bottom */}
        <div className="flex justify-between items-end gap-2 mb-2">
          <div className="min-w-0">
            <span className="text-xs text-gray-600 block">Terkumpul</span>
            <span className="text-sm font-bold text-gray-800 truncate block">Rp{formatCurrency(campaign.current_amount)}</span>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs text-gray-600 block">Sisa hari</span>
            <span className="text-sm font-semibold text-gray-700">{daysRemaining}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((campaign.current_amount / campaign.target_amount) * 100, 100)}%`,
              backgroundColor: primaryColor
            }}
          />
        </div>
      </div>
    </div>
  );
}
