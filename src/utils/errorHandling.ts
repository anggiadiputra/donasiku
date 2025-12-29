/**
 * Utility to handle and categorize Supabase/Network errors
 */

export interface ErrorResponse {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
}

/**
 * Checks if the error is a network-related failure
 */
export const isNetworkError = (error: any): boolean => {
    if (!error) return false;

    const message = (error.message || '').toLowerCase();
    const code = (error.code || '').toLowerCase();

    return (
        message.includes('failed to fetch') ||
        message.includes('network error') ||
        message.includes('load failed') ||
        message.includes('ping failed') ||
        code === 'fetch_error' ||
        !window.navigator.onLine
    );
};

/**
 * Checks if the error is a database relationship or permission error
 * that usually requires a fallback query
 */
export const isDatabaseRelationshipError = (error: any): boolean => {
    if (!error) return false;

    const message = (error.message || '').toLowerCase();
    const code = error.code;

    return (
        code === 'PGRST200' ||
        code === '42501' ||
        message.includes('relationship') ||
        message.includes('permission') ||
        message.includes('policy')
    );
};

/**
 * Simple retry wrapper for async functions
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    delayMs: number = 1000
): Promise<T> {
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Only retry on network errors, not on database errors (which are likely permanent)
            if (!isNetworkError(error) || i === maxRetries) {
                throw error;
            }

            console.warn(`Retry attempt ${i + 1} after network error...`);
            await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1))); // Exponential backoff
        }
    }

    throw lastError;
}
