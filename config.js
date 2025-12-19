// Configuration and Security Settings
const AppConfig = {
    // Security Configuration
    security: {
        // Use environment variables or secure storage in production
        users: {
            'manager': { 
                password: CryptoJS.SHA256('manager123').toString(), 
                role: 'manager', 
                page: 'budget.html' 
            },
            'accountant': { 
                password: CryptoJS.SHA256('acc123').toString(), 
                role: 'accountant', 
                page: 'index.html' 
            },
            'admin': { 
                password: CryptoJS.SHA256('admin123').toString(), 
                role: 'admin', 
                page: 'control-panel.html' 
            },
            'staff': { 
                password: CryptoJS.SHA256('staff123').toString(), 
                role: 'staff', 
                page: 'staff.html' 
            }
        },
        developerKey: 'ahmedmohamed4112024', // Will be hashed at runtime
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        maxLoginAttempts: 3,
        lockoutDuration: 15 * 60 * 1000 // 15 minutes
    },

    // Application Settings
    app: {
        name: 'Basira ERP System',
        version: '2.0.0',
        language: 'ar',
        currency: 'EGP',
        dateFormat: 'ar-EG',
        businessHours: {
            start: 8, // 8 AM
            end: 20   // 8 PM
        }
    },

    // Database Configuration
    database: {
        maxRecords: 10000,
        backupInterval: 24 * 60 * 60 * 1000, // 24 hours
        compressionEnabled: true
    },

    // UI Configuration
    ui: {
        theme: 'dark',
        animations: true,
        notifications: true,
        autoSave: true,
        autoSaveInterval: 30000 // 30 seconds
    }
};

// Security Helper Functions
const SecurityUtils = {
    hashPassword: (password) => {
        if (typeof CryptoJS === 'undefined') return password;
        return CryptoJS.SHA256(password + 'basira_salt_2024').toString();
    },

    validatePassword: (password, hash) => {
        return SecurityUtils.hashPassword(password) === hash;
    },

    generateToken: () => {
        if (typeof CryptoJS === 'undefined') {
            return Math.random().toString(36).substr(2, 16);
        }
        return CryptoJS.lib.WordArray.random(128/8).toString();
    },

    isSessionValid: (sessionData) => {
        if (!sessionData || !sessionData.timestamp) return false;
        const now = Date.now();
        return (now - sessionData.timestamp) < AppConfig.security.sessionTimeout;
    },

    sanitizeInput: (input) => {
        if (typeof input !== 'string') return input;
        return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                   .replace(/javascript:/gi, '')
                   .replace(/on\w+\s*=/gi, '');
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppConfig, SecurityUtils };
}