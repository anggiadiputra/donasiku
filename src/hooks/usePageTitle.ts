import { useEffect } from 'react';
import { useAppName } from './useAppName';

/**
 * Hook to set the page title.
 * @param title - The title to set.
 * @param suffix - Optional suffix to append to the title. If not provided, it uses the app name.
 */
export const usePageTitle = (title: string, suffix?: string | null) => {
    const { appName } = useAppName();

    useEffect(() => {
        const titleSuffix = suffix !== undefined ? (suffix || '') : ` - ${appName}`;
        document.title = title + titleSuffix;
    }, [title, suffix, appName]);
};
