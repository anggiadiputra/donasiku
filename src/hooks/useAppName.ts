import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAppName() {
  const [appName, setAppName] = useState<string>('Donasiku');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppName = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('app_name')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching app name:', error);
        }

        if (data && data.app_name) {
          setAppName(data.app_name);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppName();
  }, []);

  return { appName, loading };
}

