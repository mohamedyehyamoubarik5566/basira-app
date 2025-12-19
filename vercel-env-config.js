// Production Environment Configuration for Vercel
const VercelConfig = {
    // Get base URL dynamically
    getBaseUrl: () => {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    },

    // Database configuration for production
    database: {
        // Use environment variables in production
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        
        // Fallback to localStorage if no Supabase config
        useLocalStorage: !process.env.NEXT_PUBLIC_SUPABASE_URL
    },

    // Security settings for production
    security: {
        // Use secure settings in production
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        maxLoginAttempts: 3,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        
        // CORS settings for Vercel
        allowedOrigins: [
            'localhost:3000',
            process.env.VERCEL_URL,
            // Add your custom domain here when you have one
        ].filter(Boolean)
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VercelConfig;
} else if (typeof window !== 'undefined') {
    window.VercelConfig = VercelConfig;
}