// Enhanced Security Module
class SecurityManager {
    constructor() {
        this.sessionKey = 'basira_session';
        this.csrfToken = this.generateCSRFToken();
    }

    // Enhanced CSRF Protection
    generateCSRFToken() {
        const timestamp = Date.now().toString();
        const randomBytes = CryptoJS.lib.WordArray.random(256/8).toString();
        const token = CryptoJS.SHA256(timestamp + randomBytes + this.sessionKey).toString();
        this.csrfTokenTimestamp = Date.now();
        return token;
    }

    validateCSRFToken(token) {
        if (!token || !this.csrfToken || !this.csrfTokenTimestamp) return false;
        
        // Check token expiry (5 minutes)
        const tokenAge = Date.now() - this.csrfTokenTimestamp;
        if (tokenAge > 5 * 60 * 1000) {
            this.csrfToken = this.generateCSRFToken();
            return false;
        }
        
        return token === this.csrfToken;
    }

    // Enhanced Input Sanitization
    sanitizeHTML(input) {
        if (typeof input !== 'string') return '';
        
        // Create a temporary element for safe HTML encoding
        const div = document.createElement('div');
        div.textContent = input;
        let sanitized = div.innerHTML;
        
        // Additional sanitization for dangerous patterns
        sanitized = sanitized
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/data:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/<script[^>]*>.*?<\/script>/gis, '')
            .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
            .replace(/<object[^>]*>.*?<\/object>/gis, '')
            .replace(/<embed[^>]*>/gi, '')
            .replace(/<link[^>]*>/gi, '')
            .replace(/<meta[^>]*>/gi, '');
            
        return sanitized.trim().substring(0, 1000);
    }

    sanitizeSQL(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/['";\\]/g, '')
            .replace(/--/g, '')
            .replace(/\/\*/g, '')
            .replace(/\*\//g, '')
            .replace(/xp_/gi, '')
            .replace(/sp_/gi, '')
            .replace(/exec/gi, '')
            .replace(/execute/gi, '')
            .replace(/union/gi, '')
            .replace(/select/gi, '')
            .replace(/insert/gi, '')
            .replace(/update/gi, '')
            .replace(/delete/gi, '')
            .replace(/drop/gi, '')
            .replace(/create/gi, '')
            .replace(/alter/gi, '')
            .trim()
            .substring(0, 500);
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

    // Enhanced Content Security Policy
    setupCSP() {
        // Remove any existing CSP meta tags
        const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (existingCSP) {
            existingCSP.remove();
        }
        
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
        ].join('; ');
        
        document.head.appendChild(meta);
        
        // Add additional security headers via meta tags
        this.addSecurityHeaders();
    }
    
    addSecurityHeaders() {
        const headers = [
            { name: 'X-Content-Type-Options', content: 'nosniff' },
            { name: 'X-Frame-Options', content: 'DENY' },
            { name: 'X-XSS-Protection', content: '1; mode=block' },
            { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
        ];
        
        headers.forEach(header => {
            const existing = document.querySelector(`meta[http-equiv="${header.name}"]`);
            if (existing) existing.remove();
            
            const meta = document.createElement('meta');
            meta.httpEquiv = header.name;
            meta.content = header.content;
            document.head.appendChild(meta);
        });
    }

    // Enhanced Session Management
    createSecureSession(userData) {
        const sessionId = this.generateSecureSessionId();
        const sessionData = {
            ...userData,
            sessionId: sessionId,
            timestamp: Date.now(),
            lastActivity: Date.now(),
            csrfToken: this.csrfToken,
            fingerprint: this.generateFingerprint(),
            ipAddress: this.getClientIP(),
            userAgent: navigator.userAgent.substring(0, 200)
        };

        // Use dynamic encryption key
        const encryptionKey = this.generateSessionKey(sessionId);
        const encryptedSession = CryptoJS.AES.encrypt(
            JSON.stringify(sessionData), 
            encryptionKey
        ).toString();

        // Store session with expiration
        const sessionWrapper = {
            data: encryptedSession,
            created: Date.now(),
            expires: Date.now() + AppConfig.security.sessionTimeout
        };

        db.setItem(this.sessionKey, JSON.stringify(sessionWrapper));
        
        // Log session creation
        this.logSecurityEvent('session_created', {
            sessionId: sessionId,
            username: userData.username,
            role: userData.role
        });
        
        return sessionData;
    }
    
    generateSecureSessionId() {
        const timestamp = Date.now().toString();
        const randomBytes = CryptoJS.lib.WordArray.random(256/8).toString();
        return CryptoJS.SHA256(timestamp + randomBytes + navigator.userAgent).toString();
    }
    
    generateSessionKey(sessionId) {
        return CryptoJS.SHA256(sessionId + 'basira_session_key_2024' + Date.now().toString().slice(0, -3)).toString();
    }
    
    getClientIP() {
        // This is a placeholder - in a real app, this would come from the server
        return 'client-side';
    }

    getSecureSession() {
        try {
            const sessionWrapper = db.getItem(this.sessionKey);
            if (!sessionWrapper) return null;
            
            const wrapper = JSON.parse(sessionWrapper);
            
            // Check if session has expired
            if (Date.now() > wrapper.expires) {
                this.destroySession();
                this.logSecurityEvent('session_expired');
                return null;
            }

            const sessionData = this.decryptSessionData(wrapper.data);
            if (!sessionData) {
                this.destroySession();
                return null;
            }

            // Validate session
            if (!this.validateSession(sessionData)) {
                this.destroySession();
                return null;
            }
            
            // Update last activity
            sessionData.lastActivity = Date.now();
            this.updateSessionActivity(sessionData);

            return sessionData;
        } catch (error) {
            console.error('Session retrieval error:', error);
            this.destroySession();
            this.logSecurityEvent('session_error', { error: error.message });
            return null;
        }
    }
    
    decryptSessionData(encryptedData) {
        try {
            // Try multiple decryption keys for backward compatibility
            const keys = [
                this.generateSessionKey(this.getStoredSessionId()),
                'basira_secret_key_2024' // Fallback for old sessions
            ];
            
            for (const key of keys) {
                try {
                    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
                    const sessionData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
                    if (sessionData && sessionData.timestamp) {
                        return sessionData;
                    }
                } catch (e) {
                    continue;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    
    getStoredSessionId() {
        try {
            const wrapper = JSON.parse(db.getItem(this.sessionKey) || '{}');
            const sessionData = this.decryptSessionData(wrapper.data);
            return sessionData?.sessionId || '';
        } catch {
            return '';
        }
    }
    
    updateSessionActivity(sessionData) {
        try {
            const encryptionKey = this.generateSessionKey(sessionData.sessionId);
            const encryptedSession = CryptoJS.AES.encrypt(
                JSON.stringify(sessionData), 
                encryptionKey
            ).toString();

            const sessionWrapper = {
                data: encryptedSession,
                created: Date.now(),
                expires: Date.now() + AppConfig.security.sessionTimeout
            };

            db.setItem(this.sessionKey, JSON.stringify(sessionWrapper));
        } catch (error) {
            console.error('Failed to update session activity:', error);
        }
    }

    validateSession(sessionData) {
        if (!sessionData || !sessionData.timestamp || !sessionData.sessionId) {
            this.logSecurityEvent('invalid_session_data');
            return false;
        }

        const now = Date.now();
        
        // Check session expiration
        if ((now - sessionData.timestamp) > AppConfig.security.sessionTimeout) {
            this.logSecurityEvent('session_timeout', { sessionId: sessionData.sessionId });
            return false;
        }
        
        // Check activity timeout (30 minutes of inactivity)
        if (sessionData.lastActivity && (now - sessionData.lastActivity) > (30 * 60 * 1000)) {
            this.logSecurityEvent('session_inactive', { sessionId: sessionData.sessionId });
            return false;
        }

        // Check fingerprint with tolerance for minor changes
        const currentFingerprint = this.generateFingerprint();
        if (!this.compareFingerprintsWithTolerance(sessionData.fingerprint, currentFingerprint)) {
            this.logSecurityEvent('fingerprint_mismatch', { 
                sessionId: sessionData.sessionId,
                stored: sessionData.fingerprint?.substring(0, 10),
                current: currentFingerprint?.substring(0, 10)
            });
            return false;
        }
        
        // Check for session hijacking indicators
        if (this.detectSessionHijacking(sessionData)) {
            this.logSecurityEvent('possible_hijacking', { sessionId: sessionData.sessionId });
            return false;
        }

        return true;
    }
    
    compareFingerprintsWithTolerance(stored, current) {
        if (!stored || !current) return false;
        
        // Allow for minor differences in fingerprint (e.g., screen resolution changes)
        const storedParts = stored.split('|');
        const currentParts = current.split('|');
        
        if (storedParts.length !== currentParts.length) return false;
        
        let matches = 0;
        for (let i = 0; i < storedParts.length; i++) {
            if (storedParts[i] === currentParts[i]) {
                matches++;
            }
        }
        
        // Require at least 80% match
        return (matches / storedParts.length) >= 0.8;
    }
    
    detectSessionHijacking(sessionData) {
        // Check for rapid location changes (simplified)
        if (sessionData.userAgent && sessionData.userAgent !== navigator.userAgent.substring(0, 200)) {
            return true;
        }
        
        // Check for suspicious activity patterns
        const now = Date.now();
        const sessionAge = now - sessionData.timestamp;
        const activityGap = sessionData.lastActivity ? (now - sessionData.lastActivity) : 0;
        
        // Suspicious if session is very old but recently active
        if (sessionAge > (24 * 60 * 60 * 1000) && activityGap < (5 * 60 * 1000)) {
            return true;
        }
        
        return false;
    }

    destroySession() {
        try {
            const sessionData = this.getSecureSession();
            if (sessionData) {
                this.logSecurityEvent('session_destroyed', {
                    sessionId: sessionData.sessionId,
                    username: sessionData.username
                });
            }
            
            db.removeItem(this.sessionKey);
            this.csrfToken = this.generateCSRFToken();
            
            // Clear any cached session data
            this.clearSessionCache();
            
        } catch (error) {
            console.error('Error destroying session:', error);
            // Force clear even if there's an error
            db.removeItem(this.sessionKey);
        }
    }
    
    clearSessionCache() {
        // Clear any session-related data from memory
        this.sessionCache = null;
        this.lastValidation = null;
    }

    // Enhanced Browser Fingerprinting
    generateFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Basira Security Check', 2, 2);
            
            // Collect more fingerprint data
            const fingerprint = [
                navigator.userAgent?.substring(0, 200) || '',
                navigator.language || '',
                navigator.languages?.join(',').substring(0, 100) || '',
                screen.width + 'x' + screen.height,
                screen.colorDepth || '',
                new Date().getTimezoneOffset(),
                navigator.platform?.substring(0, 50) || '',
                navigator.cookieEnabled ? '1' : '0',
                navigator.doNotTrack || '',
                canvas.toDataURL().substring(0, 100),
                this.getWebGLFingerprint(),
                this.getAudioFingerprint()
            ].join('|');

            return CryptoJS.SHA256(fingerprint).toString();
        } catch (error) {
            console.error('Fingerprint generation error:', error);
            // Fallback fingerprint
            return CryptoJS.SHA256(navigator.userAgent + Date.now()).toString();
        }
    }
    
    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return 'no-webgl';
            
            const renderer = gl.getParameter(gl.RENDERER);
            const vendor = gl.getParameter(gl.VENDOR);
            return (renderer + '|' + vendor).substring(0, 100);
        } catch {
            return 'webgl-error';
        }
    }
    
    getAudioFingerprint() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            const fingerprint = [
                audioContext.sampleRate,
                audioContext.state,
                analyser.frequencyBinCount
            ].join('|');
            
            audioContext.close();
            return fingerprint;
        } catch {
            return 'audio-error';
        }
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

    // Enhanced Brute Force Protection
    checkBruteForce(identifier) {
        const attempts = db.getItem(`security_attempts_${identifier}`, []);
        const now = Date.now();
        
        // Clean old attempts
        const validAttempts = attempts.filter(attempt => 
            (now - attempt.timestamp) < AppConfig.security.lockoutDuration
        );
        
        // Progressive lockout - increase lockout time with more attempts
        const failedAttempts = validAttempts.filter(a => !a.success);
        const lockoutMultiplier = Math.min(failedAttempts.length, 10);
        const currentLockoutDuration = AppConfig.security.lockoutDuration * lockoutMultiplier;
        
        // Check if currently locked out
        const lastFailedAttempt = failedAttempts[failedAttempts.length - 1];
        if (lastFailedAttempt && (now - lastFailedAttempt.timestamp) < currentLockoutDuration) {
            const remainingTime = Math.ceil((currentLockoutDuration - (now - lastFailedAttempt.timestamp)) / 1000 / 60);
            this.logSecurityEvent('account_locked', { 
                identifier, 
                attempts: failedAttempts.length,
                remainingMinutes: remainingTime
            });
            return { allowed: false, remainingMinutes: remainingTime, attempts: failedAttempts.length };
        }

        // Check if too many recent attempts
        if (failedAttempts.length >= AppConfig.security.maxLoginAttempts) {
            this.logSecurityEvent('brute_force_detected', { 
                identifier, 
                attempts: failedAttempts.length 
            });
            return { allowed: false, remainingMinutes: Math.ceil(currentLockoutDuration / 1000 / 60), attempts: failedAttempts.length };
        }

        return { allowed: true, attempts: failedAttempts.length };
    }

    recordSecurityAttempt(identifier, success = false, additionalData = {}) {
        const attempts = db.getItem(`security_attempts_${identifier}`, []);
        const attemptRecord = {
            timestamp: Date.now(),
            success: success,
            userAgent: navigator.userAgent?.substring(0, 200) || '',
            fingerprint: this.generateFingerprint(),
            ipAddress: this.getClientIP(),
            ...additionalData
        };
        
        attempts.push(attemptRecord);

        // Keep only recent attempts (last 24 hours)
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const validAttempts = attempts.filter(attempt => attempt.timestamp > dayAgo);

        db.setItem(`security_attempts_${identifier}`, validAttempts);

        // Log the attempt
        this.logSecurityEvent(success ? 'login_success' : 'login_failed', {
            identifier,
            success,
            totalAttempts: validAttempts.length,
            failedAttempts: validAttempts.filter(a => !a.success).length
        });

        if (success) {
            // Clear failed attempts on success, but keep successful ones for audit
            const successfulAttempts = validAttempts.filter(a => a.success);
            db.setItem(`security_attempts_${identifier}`, successfulAttempts);
        }
    }

    // Enhanced Data Encryption
    encryptData(data, customKey = null) {
        try {
            if (!data) return null;
            
            const key = customKey || this.generateDataEncryptionKey();
            const iv = CryptoJS.lib.WordArray.random(128/8);
            const salt = CryptoJS.lib.WordArray.random(256/8);
            
            // Derive key using PBKDF2
            const derivedKey = CryptoJS.PBKDF2(key, salt, {
                keySize: 256/32,
                iterations: 10000
            });
            
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), derivedKey, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            
            return {
                data: encrypted.toString(),
                iv: iv.toString(),
                salt: salt.toString(),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    decryptData(encryptedObject, customKey = null) {
        try {
            if (!encryptedObject || typeof encryptedObject !== 'object') {
                // Handle legacy string format
                if (typeof encryptedObject === 'string') {
                    return this.decryptLegacyData(encryptedObject, customKey);
                }
                return null;
            }
            
            const key = customKey || this.generateDataEncryptionKey();
            const salt = CryptoJS.enc.Hex.parse(encryptedObject.salt);
            const iv = CryptoJS.enc.Hex.parse(encryptedObject.iv);
            
            // Derive the same key
            const derivedKey = CryptoJS.PBKDF2(key, salt, {
                keySize: 256/32,
                iterations: 10000
            });
            
            const decrypted = CryptoJS.AES.decrypt(encryptedObject.data, derivedKey, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            
            const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
            return JSON.parse(decryptedText);
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }
    
    decryptLegacyData(encryptedData, key = 'basira_data_key') {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
            return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        } catch (error) {
            return null;
        }
    }
    
    generateDataEncryptionKey() {
        return AppConfig.security.encryptionKey || 'basira_default_key_2024';
    }

    // Enhanced Secure Random Generation
    generateSecureRandom(length = 32) {
        try {
            // Use crypto.getRandomValues if available (more secure)
            if (window.crypto && window.crypto.getRandomValues) {
                const array = new Uint8Array(length);
                window.crypto.getRandomValues(array);
                return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            }
            
            // Fallback to CryptoJS
            return CryptoJS.lib.WordArray.random(length).toString();
        } catch (error) {
            console.error('Secure random generation error:', error);
            // Ultimate fallback
            return Array.from({length}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        }
    }
    
    generateNonce() {
        return this.generateSecureRandom(16);
    }
    
    generateApiKey() {
        return this.generateSecureRandom(64);
    }

    // Enhanced Password Strength Validation
    validatePasswordStrength(password) {
        if (!password || typeof password !== 'string') {
            return { score: 0, isStrong: false, feedback: ['كلمة المرور مطلوبة'] };
        }

        const minLength = 8;
        const maxLength = 128;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'/~`]/.test(password);
        const hasArabicChars = /[\u0600-\u06FF]/.test(password);
        const noRepeatingChars = !/(..).*\1/.test(password); // No repeating patterns
        const noSequentialChars = !/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789|890)/i.test(password);
        
        // Check against common passwords
        const commonPasswords = ['password', '123456', 'admin', 'user', 'basira', 'manager'];
        const notCommon = !commonPasswords.some(common => password.toLowerCase().includes(common));
        
        const checks = {
            minLength: password.length >= minLength,
            maxLength: password.length <= maxLength,
            hasUpperCase,
            hasLowerCase,
            hasNumbers,
            hasSpecialChar,
            noRepeatingChars,
            noSequentialChars,
            notCommon
        };

        const score = Object.values(checks).filter(Boolean).length;
        const maxScore = Object.keys(checks).length;
        const strengthPercentage = Math.round((score / maxScore) * 100);

        return {
            score: score,
            maxScore: maxScore,
            percentage: strengthPercentage,
            isStrong: score >= 7, // Require most checks to pass
            isAcceptable: score >= 5, // Minimum acceptable
            feedback: this.getPasswordFeedback(password, checks),
            strength: this.getPasswordStrengthLevel(strengthPercentage)
        };
    }
    
    getPasswordStrengthLevel(percentage) {
        if (percentage >= 90) return 'قوية جداً';
        if (percentage >= 70) return 'قوية';
        if (percentage >= 50) return 'متوسطة';
        if (percentage >= 30) return 'ضعيفة';
        return 'ضعيفة جداً';
    }

    getPasswordFeedback(password, checks) {
        const feedback = [];
        
        if (!checks.minLength) {
            feedback.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        }
        if (!checks.maxLength) {
            feedback.push('كلمة المرور يجب أن تكون أقل من 128 حرف');
        }
        if (!checks.hasUpperCase) {
            feedback.push('يجب أن تحتوي على حرف كبير (A-Z)');
        }
        if (!checks.hasLowerCase) {
            feedback.push('يجب أن تحتوي على حرف صغير (a-z)');
        }
        if (!checks.hasNumbers) {
            feedback.push('يجب أن تحتوي على رقم (0-9)');
        }
        if (!checks.hasSpecialChar) {
            feedback.push('يجب أن تحتوي على رمز خاص (!@#$%^&*)');
        }
        if (!checks.noRepeatingChars) {
            feedback.push('تجنب الأنماط المتكررة');
        }
        if (!checks.noSequentialChars) {
            feedback.push('تجنب التسلسلات المتتالية (abc, 123)');
        }
        if (!checks.notCommon) {
            feedback.push('تجنب كلمات المرور الشائعة');
        }
        
        if (feedback.length === 0) {
            feedback.push('كلمة مرور قوية!');
        }

        return feedback;
    }
}

    // Security Monitoring and Alerts
    startSecurityMonitoring() {
        // Monitor for suspicious activities
        this.monitoringInterval = setInterval(() => {
            this.checkSecurityThreats();
        }, 60000); // Check every minute
        
        // Monitor for tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.logSecurityEvent('tab_hidden');
            } else {
                this.logSecurityEvent('tab_visible');
                this.validateCurrentSession();
            }
        });
        
        // Monitor for developer tools
        this.detectDevTools();
    }
    
    checkSecurityThreats() {
        try {
            // Check for multiple failed login attempts
            const securityLog = db.getItem('securityLog', []);
            const recentFailures = securityLog.filter(log => 
                log.event === 'login_failed' && 
                (Date.now() - new Date(log.timestamp).getTime()) < (5 * 60 * 1000)
            );
            
            if (recentFailures.length > 10) {
                this.triggerSecurityAlert('multiple_failed_logins', {
                    count: recentFailures.length,
                    timeframe: '5 minutes'
                });
            }
            
            // Check session integrity
            this.validateCurrentSession();
            
        } catch (error) {
            console.error('Security monitoring error:', error);
        }
    }
    
    detectDevTools() {
        let devtools = { open: false, orientation: null };
        
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > 200 || 
                window.outerWidth - window.innerWidth > 200) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.logSecurityEvent('devtools_opened');
                }
            } else {
                if (devtools.open) {
                    devtools.open = false;
                    this.logSecurityEvent('devtools_closed');
                }
            }
        }, 1000);
    }
    
    validateCurrentSession() {
        const session = this.getSecureSession();
        if (!session) {
            this.handleSessionInvalid();
        }
    }
    
    handleSessionInvalid() {
        this.logSecurityEvent('session_invalid_redirect');
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }
    
    triggerSecurityAlert(type, data) {
        this.logSecurityEvent('security_alert', { alertType: type, ...data });
        
        // Show user notification for critical alerts
        if (['multiple_failed_logins', 'possible_hijacking'].includes(type)) {
            this.showSecurityNotification(type, data);
        }
    }
    
    showSecurityNotification(type, data) {
        const messages = {
            'multiple_failed_logins': 'تم اكتشاف محاولات دخول متعددة فاشلة. يرجى التحقق من أمان حسابك.',
            'possible_hijacking': 'تم اكتشاف نشاط مشبوه في جلستك. سيتم تسجيل خروجك للأمان.'
        };
        
        const message = messages[type] || 'تم اكتشاف نشاط أمني مشبوه.';
        
        if (window.notify) {
            window.notify.show(message, 'error', 10000);
        } else {
            alert(message);
        }
    }
    
    stopSecurityMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }
}

// Initialize Security Manager
const securityManager = new SecurityManager();

// Setup security on load
document.addEventListener('DOMContentLoaded', () => {
    securityManager.setupCSP();
    securityManager.startSecurityMonitoring();
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    securityManager.stopSecurityMonitoring();
});

// Export for global use
window.SecurityManager = SecurityManager;
window.securityManager = securityManager;