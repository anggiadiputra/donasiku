import { useEffect } from 'react';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const primaryColor = usePrimaryColor();

  useEffect(() => {
    // Set CSS variable for primary color
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    
    // Calculate hover color (darker by 10%)
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const hoverR = Math.max(0, r - 25);
    const hoverG = Math.max(0, g - 25);
    const hoverB = Math.max(0, b - 25);
    const hoverColor = `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;
    document.documentElement.style.setProperty('--primary-color-hover', hoverColor);
  }, [primaryColor]);

  return <>{children}</>;
}

