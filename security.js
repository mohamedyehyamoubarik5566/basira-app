// Enhanced Security Module
class SecurityManager {
    constructor() {
        this.sessionKey = 'basira_session';
        this.csrfToken = this.generateCSRFToken();
    }

    // CSRF Protection
    generateCSRFToken() {
        return CryptoJS.lib.WordArray.random(128/8).toString();
    }

    validateCSRFToken(token) {
        return token === this.csrfToken;
    }

    // Input Sanitization
    sanitizeHTML(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    sanitizeSQL(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/['";\\]/g, '');
    }

    // XSS Protection
    escapeHTML(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Content Security Policy
    setupCSP() {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;";
        document.head.appendChild(meta);
    }

    // Session Management
    createSecureSession(userData) {
        const sessionData = {
            ...userData,
            timestamp: Date.now(),
            csrfToken: this.csrfToken,
            fingerprint: this.generateFingerprint()
        };

        const encryptedSession = CryptoJS.AES.encrypt(
            JSON.stringify(sessionData), 
            'basira_secret_key_2024'
        ).toString();

        db.setItem(this.sessionKey, encryptedSession);
        return sessionData;
    }

    getSecureSession() {
        try {
            const encryptedSession = db.getItem(this.sessionKey);
            if (!encryptedSession) return null;

            const decrypted = CryptoJS.AES.decrypt(encryptedSession, 'basira_secret_key_2024');
            const sessionData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

            // Validate session
            if (!this.validateSession(sessionData)) {
                this.destroySession();
                return null;
            }

            return sessionData;
        } catch (error) {
            // Error retrieving session
            this.destroySession();
            return null;
        }
    }

    validateSession(sessionData) {
        if (!sessionData || !sessionData.timestamp) return false;

        // Check expiration
        const now = Date.now();
        if ((now - sessionData.timestamp) > AppConfig.security.sessionTimeout) {
            return false;
        }

        // Check fingerprint
        if (sessionData.fingerprint !== this.generateFingerprint()) {
            // Session fingerprint mismatch detected
            return false;
        }

        return true;
    }

    destroySession() {
        db.removeItem(this.sessionKey);
        this.csrfToken = this.generateCSRFToken();
    }

    // Browser Fingerprinting
    generateFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Browser fingerprint', 2, 2);

        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');

        return CryptoJS.SHA256(fingerprint).toString();
    }

    // Audit Logging
    logSecurityEvent(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            details: details,
            userAgent: navigator.userAgent,
            ip: 'client-side', // Would be server IP in real implementation
            sessionId: this.getSecureSession()?.username || 'anonymous'
        };

        const securityLog = db.getItem('securityLog', []);
        securityLog.push(logEntry);

        // Keep only last 1000 entries
        if (securityLog.length > 1000) {
            securityLog.splice(0, securityLog.length - 1000);
        }

        db.setItem('securityLog', securityLog);
    }

    // Brute Force Protection
    checkBruteForce(identifier) {
        const attempts = db.getItem(`security_attempts_${identifier}`, []);
        const now = Date.now();
        const recentAttempts = attempts.filter(attempt => 
            (now - attempt.timestamp) < AppConfig.security.lockoutDuration
        );

        if (recentAttempts.length >= AppConfig.security.maxLoginAttempts) {
            this.logSecurityEvent('brute_force_detected', { identifier });
            return false;
        }

        return true;
    }

    recordSecurityAttempt(identifier, success = false) {
        const attempts = db.getItem(`security_attempts_${identifier}`, []);
        attempts.push({
            timestamp: Date.now(),
            success: success,
            userAgent: navigator.userAgent
        });

        // Clean old attempts
        const validAttempts = attempts.filter(attempt => 
            (Date.now() - attempt.timestamp) < AppConfig.security.lockoutDuration
        );

        db.setItem(`security_attempts_${identifier}`, validAttempts);

        if (success) {
            // Clear failed attempts on success
            db.removeItem(`security_attempts_${identifier}`);
        }
    }

    // Data Encryption
    encryptData(data, key = 'basira_data_key') {
        try {
            return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
        } catch (error) {
            // Encryption error occurred
            return null;
        }
    }

    decryptData(encryptedData, key = 'basira_data_key') {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
            return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        } catch (error) {
            // Decryption error occurred
            return null;
        }
    }

    // Secure Random Number Generation
    generateSecureRandom(length = 32) {
        return CryptoJS.lib.WordArray.random(length).toString();
    }

    // Password Strength Validation
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const score = [
            password.length >= minLength,
            hasUpperCase,
            hasLowerCase,
            hasNumbers,
            hasSpecialChar
        ].filter(Boolean).length;

        return {
            score: score,
            isStrong: score >= 4,
            feedback: this.getPasswordFeedback(password, {
                hasUpperCase,
                hasLowerCase,
                hasNumbers,
                hasSpecialChar,
                minLength: password.length >= minLength
            })
        };
    }

    getPasswordFeedback(password, checks) {
        const feedback = [];
        
        if (!checks.minLength) {
            feedback.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        }
        if (!checks.hasUpperCase) {
            feedback.push('يجب أن تحتوي على حرف كبير');
        }
        if (!checks.hasLowerCase) {
            feedback.push('يجب أن تحتوي على حرف صغير');
        }
        if (!checks.hasNumbers) {
            feedback.push('يجب أن تحتوي على رقم');
        }
        if (!checks.hasSpecialChar) {
            feedback.push('يجب أن تحتوي على رمز خاص');
        }

        return feedback;
    }
}

// Initialize Security Manager
const securityManager = new SecurityManager();

// Setup CSP on load
document.addEventListener('DOMContentLoaded', () => {
    securityManager.setupCSP();
});

// Export for global use
window.SecurityManager = SecurityManager;
window.securityManager = securityManager;