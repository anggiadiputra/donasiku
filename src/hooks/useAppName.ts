import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAppName() {
  const [appName, setAppName] = useState<string>(() => {
    return localStorage.getItem('data_app_name') || 'Donasiku';
  });
  const [tagline, setTagline] = useState<string>(() => {
    return localStorage.getItem('data_app_tagline') || '';
  });
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem('data_app_logo_url') || '';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppName = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('app_name, tagline, logo_url')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching app settings:', error);
        }

        if (data) {
          if (data.app_name) {
            setAppName(data.app_name);
            localStorage.setItem('data_app_name', data.app_name);
          }
          if (data.tagline) {
            setTagline(data.tagline);
            localStorage.setItem('data_app_tagline', data.tagline);
          }
          if (data.logo_url) {
            setLogoUrl(data.logo_url);
            localStorage.setItem('data_app_logo_url', data.logo_url);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppName();
  }, []);

  return { appName, tagline, logoUrl, loading };
}

