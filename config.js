// Configuration and Security Settings
const AppConfig = {
    // Security Configuration
    security: {
        // Secure user authentication - passwords are hashed with salt
        users: {
            'manager': { 
                passwordHash: null, // Will be set securely at runtime
                role: 'manager', 
                page: 'budget.html',
                salt: null
            },
            'accountant': { 
                passwordHash: null, // Will be set securely at runtime
                role: 'accountant', 
                page: 'index.html',
                salt: null
            },
            'admin': { 
                passwordHash: null, // Will be set securely at runtime
                role: 'admin', 
                page: 'control-panel.html',
                salt: null
            },
            'staff': { 
                passwordHash: null, // Will be set securely at runtime
                role: 'staff', 
                page: 'staff.html',
                salt: null
            }
        },
        developerKeyHash: null, // Will be hashed at runtime
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        maxLoginAttempts: 3,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        saltRounds: 12,
        encryptionKey: null // Will be generated at runtime
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
    // Generate cryptographically secure salt
    generateSalt: () => {
        if (typeof CryptoJS === 'undefined') {
            return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }
        return CryptoJS.lib.WordArray.random(256/8).toString();
    },

    // Secure password hashing with salt and multiple iterations
    hashPassword: (password, salt) => {
        try {
            // Wait for CryptoJS to be available
            if (typeof CryptoJS === 'undefined') {
                console.warn('CryptoJS not yet available, deferring hash operation');
                return null;
            }
            if (!salt) salt = SecurityUtils.generateSalt();
            
            let hash = password + salt;
            // Multiple iterations for security
            for (let i = 0; i < 10000; i++) {
                hash = CryptoJS.SHA256(hash).toString();
            }
            return { hash, salt };
        } catch (error) {
            console.warn('Password hashing failed:', error);
            return null;
        }
    },

    validatePassword: (password, storedHash, salt) => {
        if (!password || !storedHash || !salt) return false;
        const { hash } = SecurityUtils.hashPassword(password, salt);
        return hash === storedHash;
    },

    generateSecureToken: () => {
        if (typeof CryptoJS === 'undefined') {
            return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
        }
        return CryptoJS.lib.WordArray.random(256/8).toString();
    },

    isSessionValid: (sessionData) => {
        if (!sessionData || !sessionData.timestamp || !sessionData.token) return false;
        const now = Date.now();
        const isNotExpired = (now - sessionData.timestamp) < AppConfig.security.sessionTimeout;
        const hasValidToken = sessionData.token && sessionData.token.length >= 32;
        return isNotExpired && hasValidToken;
    },

    sanitizeInput: (input) => {
        if (typeof input !== 'string') return '';
        return input
            .replace(/<script[^>]*>.*?<\/script>/gis, '')
            .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
            .replace(/<object[^>]*>.*?<\/object>/gis, '')
            .replace(/<embed[^>]*>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/data:text\/html/gi, '')
            .replace(/[<>"'&]/g, function(match) {
                const map = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;',
                    '&': '&amp;'
                };
                return map[match];
            })
            .trim()
            .substring(0, 1000); // Limit length
    },

    validateInput: (input, type = 'text') => {
        if (!input || typeof input !== 'string') return false;
        
        const patterns = {
            text: /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s\-_.،؛:()\[\]{}"']+$/,
            number: /^[0-9]+\.?[0-9]*$/,
            phone: /^[\+]?[0-9\s\-\(\)]{10,}$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        };
        
        return patterns[type] ? patterns[type].test(input) : true;
    },

    // Initialize secure configuration
    initializeSecurity: () => {
        try {
            // Generate encryption key if not exists
            if (!AppConfig.security.encryptionKey) {
                AppConfig.security.encryptionKey = SecurityUtils.generateSecureToken();
            }

            // Hash developer key
            if (!AppConfig.security.developerKeyHash) {
                const devKey = 'ahmedmohamed4112024';
                const hashResult = SecurityUtils.hashPassword(devKey);
                if (hashResult) {
                    AppConfig.security.developerKeyHash = hashResult.hash;
                    AppConfig.security.developerKeySalt = hashResult.salt;
                }
            }

            // Initialize user password hashes
            const defaultPasswords = {
                'manager': 'manager123',
                'accountant': 'acc123', 
                'admin': 'admin123',
                'staff': 'staff123'
            };

            Object.keys(defaultPasswords).forEach(username => {
                if (!AppConfig.security.users[username].passwordHash) {
                    const hashResult = SecurityUtils.hashPassword(defaultPasswords[username]);
                    if (hashResult) {
                        AppConfig.security.users[username].passwordHash = hashResult.hash;
                        AppConfig.security.users[username].salt = hashResult.salt;
                    }
                }
            });

            console.log('Security configuration initialized');
        } catch (error) {
            console.warn('Failed to initialize security:', error.message);
        }
    }
};

// Initialize security on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        // Delay security initialization to ensure CryptoJS is loaded
        setTimeout(() => {
            SecurityUtils.initializeSecurity();
        }, 100);
    });
} else {
    // For Node.js environment
    setTimeout(() => {
        SecurityUtils.initializeSecurity();
    }, 100);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppConfig, SecurityUtils };
}