import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';

declare global {
    interface Window {
        dataLayer: any[];
        fbq: any;
        ttq: any;
        gtag: any;
    }
}

export default function AnalyticsScripts() {
    const location = useLocation();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data: settings } = await supabase
                    .from('app_settings')
                    .select('google_analytics_id, facebook_pixel_id, tiktok_pixel_id')
                    .limit(1)
                    .single();

                if (settings) {
                    // 1. Google Analytics
                    if (settings.google_analytics_id) {
                        const gaId = settings.google_analytics_id;

                        // Avoid duplicate injection
                        if (!document.getElementById('ga-script')) {
                            const script = document.createElement('script');
                            script.id = 'ga-script';
                            script.async = true;
                            script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
                            document.head.appendChild(script);

                            const inlineScript = document.createElement('script');
                            inlineScript.innerHTML = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `;
                            document.head.appendChild(inlineScript);
                        }
                    }

                    // 2. Facebook Pixel
                    if (settings.facebook_pixel_id) {
                        const fbId = settings.facebook_pixel_id;

                        if (!document.getElementById('fb-pixel-script')) {
                            const script = document.createElement('script');
                            script.id = 'fb-pixel-script';
                            script.innerHTML = `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${fbId}');
                fbq('track', 'PageView');
              `;
                            document.head.appendChild(script);

                            const noscript = document.createElement('noscript');
                            noscript.innerHTML = `<img height="1" width="1" style="display:none"
                src="https://www.facebook.com/tr?id=${fbId}&ev=PageView&noscript=1"
              />`;
                            document.head.appendChild(noscript);
                        }
                    }

                    // 3. TikTok Pixel
                    if (settings.tiktok_pixel_id) {
                        const ttId = settings.tiktok_pixel_id;

                        if (!document.getElementById('tt-pixel-script')) {
                            const script = document.createElement('script');
                            script.id = 'tt-pixel-script';
                            script.innerHTML = `
                !function (w, d, t) {
                  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t.align=2,ttq.chars=t,ttq.methods.forEach(function(t){t[e]=ttq.setAndDefer.bind(ttq,t,e)}),ttq.load=function(t,e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[t]=[],ttq._i[t]._u=n,ttq._t=ttq._t||{},ttq._t[t]=+new Date,ttq._o=ttq._o||{},ttq._o[t]=e||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=n+"?sdkid="+t+"&lib="+t;var i=document.getElementsByTagName("script")[0];i.parentNode.insertBefore(o,i)}};
                  ttq.load('${ttId}');
                  ttq.page();
                }(window, document, 'ttq');
              `;
                            document.head.appendChild(script);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load analytics settings:', error);
            }
        };

        fetchSettings();
    }, []);

    // Track PageView on route change (for SPAs)
    useEffect(() => {
        // Google Analytics
        if (typeof window.gtag === 'function') {
            // gtag('event', 'page_view', { page_path: location.pathname }); // handled by config automatically usually, but can be explicit
        }

        // Facebook Pixel
        if (typeof window.fbq === 'function') {
            window.fbq('track', 'PageView');
        }

        // TikTok Pixel
        if (typeof window.ttq === 'object' && window.ttq.page) {
            window.ttq.page();
        }
    }, [location]);

    return null;
}
