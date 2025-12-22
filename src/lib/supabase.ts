import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce',
  },
});

export interface Campaign {
  id: string;
  title: string;
  slug?: string;
  description: string;
  full_description?: string;
  image_url: string;
  target_amount: number;
  current_amount: number;
  category: string;
  category_id?: string;
  user_id?: string;
  is_urgent: boolean;
  is_verified: boolean;
  target_location?: string;
  organization_name?: string;
  organization_logo?: string;
  donor_count?: number;
  end_date?: string;
  gmaps_link?: string;
  form_type?: 'donation' | 'zakat';
  display_format?: 'card' | 'list' | 'typing' | 'package' | 'package2';
  campaign_type?: string;
  preset_amounts?: number[];
  status?: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  created_at: string;
}

export interface Donation {
  id: string;
  campaign_id: string;
  donor_name: string | null;
  amount: number;
  is_anonymous: boolean;
  payment_method: string;
  status: string;
  created_at: string;
}

export interface Testimonial {
  id: string;
  campaign_id: string;
  donor_name: string;
  message: string;
  amen_count?: number;
  source_type?: 'transaction' | 'testimonial';
  created_at: string;
}

export interface AppSettings {
  id: string;
  app_name: string;
  logo_url?: string;
  tagline?: string;
  primary_color?: string;
  font_family?: string;
  payment_methods?: string | any[]; // JSON string or array
  whatsapp_enabled: boolean;
  whatsapp_template?: string; // WhatsApp follow up template (Pending)
  whatsapp_success_template?: string; // WhatsApp success template
  fonnte_token?: string; // Optional: still keep in DB if legacy, but logic will use ENV
  whatsapp_api_key?: string;
  whatsapp_api_url?: string;
  whatsapp_phone?: string;
  email_enabled: boolean;
  email_template?: string; // New: Email template for notifications
  email_smtp_host?: string; // Legacy/Backend Env
  email_smtp_port?: number; // Legacy/Backend Env
  email_smtp_user?: string; // Legacy/Backend Env
  email_smtp_password?: string; // Legacy/Backend Env
  email_from?: string; // Legacy/Backend Env
  s3_endpoint?: string;
  s3_region?: string;
  s3_bucket?: string;
  s3_access_key_id?: string;
  s3_secret_access_key?: string;
  s3_public_url?: string;
  s3_api_endpoint?: string;
  created_at: string;
  updated_at: string;
}

export interface HeroSliderItem {
  image: string;
  title: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}

export interface ProgramMendadakItem {
  id?: string; // For drag and drop stability
  icon: string; // Icon name from lucide-react (e.g., 'heart', 'hand-heart', 'building', 'coins')
  name: string; // Program name (e.g., 'Infaq', 'Sedekah', 'Wakaf', 'Zakat')
  url: string; // URL to navigate to
}

export interface LayoutSettings {
  id: string;
  hero_slider_enabled: boolean;
  hero_slider_items: HeroSliderItem[];
  program_mendadak_enabled: boolean;
  program_mendadak_title?: string;
  program_mendadak_description?: string;
  program_mendadak_image?: string;
  program_mendadak_button_text?: string;
  program_mendadak_button_link?: string;
  program_mendadak_items?: ProgramMendadakItem[];
  campaign_list_enabled: boolean;
  campaign_list_layout: 'list' | 'grid';
  campaign_list_title?: string;
  campaign_list_limit?: number;
  promo_slider_enabled?: boolean;
  promo_slider_items?: any[];
  campaign_slider_enabled?: boolean;
  campaign_slider_title?: string;
  campaign_slider_ids?: string[]; // Array of campaign IDs
  campaign_slider_2_enabled?: boolean;
  campaign_slider_2_title?: string;
  campaign_slider_2_ids?: string[]; // Array of campaign IDs for second slider
  cta_slider_enabled?: boolean;
  cta_slider_items?: any[];
  cta_primary_label?: string;
  cta_primary_link?: string;
  cta_secondary_label?: string;
  cta_secondary_link?: string;
  footer_enabled: boolean;
  footer_content?: any;
  created_at: string;
  updated_at: string;
}

export interface ZakatSettings {
  id: string;
  gold_price_per_gram: number;
  nishab_gold_grams: number;
  zakat_percentage: number;
  calculation_note?: string;
  gold_price_source?: string;
  created_at: string;
  updated_at: string;
}

export interface InfaqSettings {
  id: string;
  program_title: string;
  program_subtitle?: string;
  program_description?: string;
  program_image?: string;
  preset_amounts: number[];
  default_amount: number;
  note_text?: string;
  quran_verse?: string;
  quran_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface FidyahSettings {
  id: string;
  program_title: string;
  program_subtitle?: string;
  program_description?: string;
  program_image?: string;
  price_per_day: number;
  target_campaign_id?: string;
  created_at: string;
  updated_at: string;
}
