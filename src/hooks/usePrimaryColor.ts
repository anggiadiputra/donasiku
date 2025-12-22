import { useAppSettings } from './useAppSettings';

export function usePrimaryColor() {
  const { settings } = useAppSettings();
  return settings?.primary_color || '#6B7280'; // Default to medium gray (neutral placeholder)
}

