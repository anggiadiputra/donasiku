/**
 * Color utility functions for dynamic theming
 */

/**
 * Darken a hex color by a percentage
 * @param color - Hex color string (e.g., '#f97316')
 * @param percent - Percentage to darken (0-100)
 * @returns Darkened hex color
 */
export const darkenColor = (color: string, percent: number = 10): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const factor = 1 - (percent / 100);
    const newR = Math.max(0, Math.floor(r * factor));
    const newG = Math.max(0, Math.floor(g * factor));
    const newB = Math.max(0, Math.floor(b * factor));

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

/**
 * Lighten a hex color by a percentage
 * @param color - Hex color string (e.g., '#f97316')
 * @param percent - Percentage to lighten (0-100)
 * @returns Lightened hex color
 */
export const lightenColor = (color: string, percent: number = 10): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const factor = percent / 100;
    const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
    const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
    const newB = Math.min(255, Math.floor(b + (255 - b) * factor));

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

/**
 * Add alpha/opacity to a hex color
 * @param color - Hex color string (e.g., '#f97316')
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 */
export const addAlpha = (color: string, opacity: number): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Get hover color (darkened version)
 * @param color - Base hex color
 * @returns Darkened hex color for hover state
 */
export const getHoverColor = (color: string): string => {
    return darkenColor(color, 15);
};

/**
 * Get focus ring color (lightened version with opacity)
 * @param color - Base hex color
 * @returns RGBA color for focus ring
 */
export const getFocusRingColor = (color: string): string => {
    return addAlpha(color, 0.3);
};
