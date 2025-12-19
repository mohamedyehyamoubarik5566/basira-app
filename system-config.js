// System Configuration - Stable Bridge Between App and Data
const SystemConfig = {
    // Database Configuration
    database: {
        supabaseUrl: 'https://your-project.supabase.co',
        supabaseAnonKey: 'your-anon-key-here',
        supabaseServiceKey: 'your-service-key-here'
    },

    // App Version Management
    version: {
        current: '2026.1.1',
        apiVersion: 'v1',
        schemaVersion: '1.0.0',
        lastUpdate: '2024-12-19T10:00:00Z'
    },

    // System Settings
    system: {
        maintenanceMode: false,
        hotSwapEnabled: true,
        autoMigration: true,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        maxRetries: 3
    },

    // CDN and Asset Management
    assets: {
        baseUrl: 'https://basira-erp.vercel.app',
        versionParam: 'v',
        cacheBuster: () => SystemConfig.version.current + '.' + Date.now()
    },

    // Required Database Schema
    requiredSchema: {
        companies: {
            columns: ['id', 'company_code', 'name', 'license_expiry', 'created_at'],
            newColumns: {
                'phone': 'TEXT',
                'address': 'TEXT',
                'vat_number': 'TEXT'
            }
        },
        sales: {
            columns: ['id', 'company_code', 'client_name', 'total_price', 'created_at'],
            newColumns: {
                'vat_amount': 'DECIMAL(10,2) DEFAULT 0',
                'discount_amount': 'DECIMAL(10,2) DEFAULT 0',
                'payment_status': 'TEXT DEFAULT \'pending\''
            }
        },
        treasury: {
            columns: ['id', 'company_code', 'transaction_type', 'amount', 'created_at'],
            newColumns: {
                'category': 'TEXT',
                'reference_id': 'TEXT',
                'approved_by': 'TEXT'
            }
        },
        staff: {
            columns: ['id', 'company_code', 'name', 'role', 'created_at'],
            newColumns: {
                'employee_id': 'TEXT UNIQUE',
                'department': 'TEXT',
                'salary': 'DECIMAL(10,2)'
            }
        }
    },

    // Maintenance Messages
    messages: {
        maintenance: {
            ar: 'جاري تحسين النظام.. بياناتك في أمان وسنعود خلال لحظات',
            en: 'System Enhancement in Progress.. Your data is safe, we\'ll be back shortly'
        },
        migration: {
            ar: 'جاري تحديث قاعدة البيانات لتحسين الأداء...',
            en: 'Updating database for improved performance...'
        }
    }
};

// Initialize Supabase Client
let supabaseClient = null;

function initializeSupabase() {
    if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
        try {
            supabaseClient = window.supabase.createClient(
                SystemConfig.database.supabaseUrl,
                SystemConfig.database.supabaseAnonKey
            );
            return supabaseClient;
        } catch (error) {
            console.warn('Supabase initialization failed:', error);
            return null;
        }
    }
    console.warn('Supabase not available, using local storage');
    return null;
}

// Export configuration
if (typeof window !== 'undefined') {
    window.SystemConfig = SystemConfig;
    window.initializeSupabase = initializeSupabase;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SystemConfig, initializeSupabase };
}