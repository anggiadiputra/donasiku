import { useState, useEffect } from 'react';
import { supabase, LayoutSettings } from '../lib/supabase';

const DEFAULT_SETTINGS: LayoutSettings = {
    id: '',
    hero_slider_enabled: true,
    hero_slider_items: [],
    program_mendadak_enabled: true,
    program_mendadak_items: [],
    campaign_list_enabled: true,
    campaign_list_layout: 'list',
    campaign_list_title: 'Rekomendasi',
    campaign_list_limit: 10,
    footer_enabled: true,
    footer_content: {}, // Default empty object for JSONB
    created_at: '',
    updated_at: '',
    promo_slider_enabled: true,
    promo_slider_items: [],
    cta_slider_enabled: true,
    cta_slider_items: [],
    campaign_slider_enabled: true,
    campaign_slider_title: 'Pilihan Donasiku',
    campaign_slider_ids: [],
    campaign_slider_2_enabled: true,
    campaign_slider_2_title: 'Pilihan Donasiku',
    campaign_slider_2_ids: []
};

export function useLayoutSettings() {
    const [settings, setSettings] = useState<LayoutSettings>(() => {
        const cached = localStorage.getItem('data_layout_settings');
        return cached ? JSON.parse(cached) : DEFAULT_SETTINGS;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('layout_settings')
                    .select('*')
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching layout settings:', error);
                }

                if (data) {
                    // Parse JSON strings if necessary (though supabase-js usually handles JSONB locally as objects)
                    // But ensure robust handling like in LayoutSettingsPage
                    const parsedData = {
                        ...data,
                        hero_slider_items: typeof data.hero_slider_items === 'string'
                            ? JSON.parse(data.hero_slider_items)
                            : (data.hero_slider_items || []),
                        program_mendadak_items: typeof data.program_mendadak_items === 'string'
                            ? JSON.parse(data.program_mendadak_items)
                            : (data.program_mendadak_items || []),
                        footer_content: typeof data.footer_content === 'string'
                            ? JSON.parse(data.footer_content)
                            : (data.footer_content || {}),
                        // ... other fields if needed, but simplified for consumer
                    };

                    setSettings(parsedData);
                    localStorage.setItem('data_layout_settings', JSON.stringify(parsedData));
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
