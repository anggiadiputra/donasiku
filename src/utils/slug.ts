/**
 * Convert a string to URL-friendly slug (lowercase)
 * Example: "Bantu Penuh Popok Untuk Anak-Anak Mulia" -> "bantu-penuh-popok-untuk-anak-anak-mulia"
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase() // Convert to lowercase
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '') // Remove special characters except hyphens
    .replace(/\-\-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, ''); // Remove trailing hyphens
}

/**
 * Find campaign by slug from database or generated from title
 */
export function findCampaignBySlug(campaigns: any[], slug: string) {
  return campaigns.find(campaign => {
    // First check if campaign has slug field from database
    if (campaign.slug) {
      return campaign.slug === slug;
    }
    // Fallback to generated slug from title
    const campaignSlug = createSlug(campaign.title);
    return campaignSlug === slug;
  });
}

