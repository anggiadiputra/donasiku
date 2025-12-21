import { useAppSettings } from './useAppSettings';

export function usePrimaryColor() {
  const { settings } = useAppSettings();
  return settings?.primary_color || '#f97316'; // Default orange color
}

