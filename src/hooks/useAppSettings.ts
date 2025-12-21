import { useState, useEffect } from 'react';
import { supabase, AppSettings } from '../lib/supabase';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching app settings:', error);
        }

        if (data) {
          setSettings({
            ...data,
            payment_methods: Array.isArray(data.payment_methods) 
              ? data.payment_methods 
              : JSON.parse(data.payment_methods || '[]')
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}

