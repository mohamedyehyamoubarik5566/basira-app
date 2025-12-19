// Enhanced Utility Functions for Better Code Organization and Security
class DatabaseManager {
    constructor() {
        this.prefix = 'basira_';
        this.version = '2.0';
        this.maxStorageSize = 5 * 1024 * 1024; // 5MB limit
        this.compressionEnabled = true;
        this.encryptionEnabled = true;
    }

    // Enhanced localStorage operations with compression and encryption
    setItem(key, value) {
        try {
            if (!key || value === undefined) {
                throw new Error('Invalid key or value');
            }

            // Validate key format
            if (typeof key !== 'string' || key.length > 100) {
                throw new Error('Invalid key format');
            }

            // Check storage quota
            if (!this.checkStorageQuota()) {
                this.cleanupOldData();
            }

            const data = {
                value: value,
                timestamp: Date.now(),
                version: this.version,
                size: JSON.stringify(value).length,
                checksum: this.generateChecksum(value)
            };

            let serializedData = JSON.stringify(data);

            // Compress if enabled and data is large
            if (this.compressionEnabled && serializedData.length > 1024) {
                serializedData = this.compressData(serializedData);
                data.compressed = true;
            }

            // Encrypt if enabled
            if (this.encryptionEnabled && window.securityManager) {
                const encrypted = window.securityManager.encryptData(data);
                if (encrypted) {
                    serializedData = JSON.stringify(encrypted);
                    data.encrypted = true;
                }
            }

            const fullKey = this.prefix + this.sanitizeKey(key);
            localStorage.setItem(fullKey, serializedData);
            
            // Update storage statistics
            this.updateStorageStats(fullKey, serializedData.length);
            
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                this.handleQuotaExceeded();
                NotificationManager.show('مساحة التخزين ممتلئة. تم تنظيف البيانات القديمة.', 'warning');
            } else {
                NotificationManager.show('خطأ في حفظ البيانات: ' + error.message, 'error');
            }
            return false;
        }
    }

    getItem(key, defaultValue = null) {
        try {
            if (!key || typeof key !== 'string') {
                return defaultValue;
            }

            const fullKey = this.prefix + this.sanitizeKey(key);
            const item = localStorage.getItem(fullKey);
            if (!item) return defaultValue;
            
            let data = JSON.parse(item);
            
            // Handle encrypted data
            if (data.encrypted && window.securityManager) {
                data = window.securityManager.decryptData(data);
                if (!data) {
                    console.warn(`Failed to decrypt data for key: ${key}`);
                    return defaultValue;
                }
            }
            
            // Handle compressed data
            if (data.compressed) {
                const decompressed = this.decompressData(JSON.stringify(data));
                data = JSON.parse(decompressed);
            }
            
            // Validate data integrity
            if (data.checksum && !this.validateChecksum(data.value, data.checksum)) {
                console.warn(`Data integrity check failed for key: ${key}`);
                this.removeItem(key); // Remove corrupted data
                return defaultValue;
            }
            
            // Check version compatibility
            if (data.version && data.version !== this.version) {
                console.warn(`Version mismatch for ${key}. Expected ${this.version}, got ${data.version}`);
                // Attempt migration if needed
                data = this.migrateData(data, key);
            }
            
            // Check data expiration if set
            if (data.expires && Date.now() > data.expires) {
                this.removeItem(key);
                return defaultValue;
            }
            
            return data.value;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            // Try to recover by removing corrupted data
            try {
                this.removeItem(key);
            } catch (removeError) {
                console.error('Failed to remove corrupted data:', removeError);
            }
            return defaultValue;
        }
    }

    removeItem(key) {
        try {
            if (!key || typeof key !== 'string') {
                return false;
            }

            const fullKey = this.prefix + this.sanitizeKey(key);
            const item = localStorage.getItem(fullKey);
            
            if (item) {
                // Update storage statistics before removal
                this.updateStorageStats(fullKey, -item.length);
            }
            
            localStorage.removeItem(fullKey);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // Enhanced backup and restore functionality
    backup(includeEncrypted = false) {
        try {
            const backup = {
                version: this.version,
                timestamp: Date.now(),
                data: {},
                metadata: {
                    totalItems: 0,
                    totalSize: 0,
                    encrypted: includeEncrypted
                }
            };
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    const item = localStorage.getItem(key);
                    if (item) {
                        // Decrypt data if needed for backup
                        let processedItem = item;
                        if (includeEncrypted) {
                            try {
                                const parsed = JSON.parse(item);
                                if (parsed.encrypted && window.securityManager) {
                                    const decrypted = window.securityManager.decryptData(parsed);
                                    if (decrypted) {
                                        processedItem = JSON.stringify(decrypted);
                                    }
                                }
                            } catch (e) {
                                // Keep original if decryption fails
                            }
                        }
                        
                        backup.data[key] = processedItem;
                        backup.metadata.totalItems++;
                        backup.metadata.totalSize += item.length;
                    }
                }
            }
            
            const backupString = JSON.stringify(backup);
            
            // Compress backup if large
            if (backupString.length > 10240) { // 10KB
                return this.compressData(backupString);
            }
            
            return backupString;
        } catch (error) {
            console.error('Error creating backup:', error);
            return null;
        }
    }

    restore(backupData, overwrite = false) {
        try {
            if (!backupData) {
                throw new Error('No backup data provided');
            }

            // Try to decompress if needed
            let processedData = backupData;
            try {
                if (typeof backupData === 'string' && backupData.startsWith('compressed:')) {
                    processedData = this.decompressData(backupData);
                }
            } catch (e) {
                // Not compressed, continue with original
            }

            const backup = JSON.parse(processedData);
            
            // Validate backup structure
            if (!backup.data || !backup.version) {
                throw new Error('Invalid backup format');
            }
            
            // Check version compatibility
            if (backup.version !== this.version) {
                console.warn(`Backup version mismatch. Backup: ${backup.version}, Current: ${this.version}`);
            }
            
            let restoredCount = 0;
            let errorCount = 0;
            
            Object.keys(backup.data).forEach(key => {
                try {
                    // Check if key already exists
                    if (!overwrite && localStorage.getItem(key)) {
                        console.log(`Skipping existing key: ${key}`);
                        return;
                    }
                    
                    localStorage.setItem(key, backup.data[key]);
                    restoredCount++;
                } catch (error) {
                    console.error(`Error restoring key ${key}:`, error);
                    errorCount++;
                }
            });
            
            console.log(`Backup restore completed. Restored: ${restoredCount}, Errors: ${errorCount}`);
            
            if (errorCount > 0) {
                NotificationManager.show(`تم استعادة ${restoredCount} عنصر مع ${errorCount} أخطاء`, 'warning');
            } else {
                NotificationManager.show(`تم استعادة ${restoredCount} عنصر بنجاح`, 'success');
            }
            
            return { success: true, restored: restoredCount, errors: errorCount };
        } catch (error) {
            console.error('Error restoring backup:', error);
            NotificationManager.show('خطأ في استعادة النسخة الاحتياطية: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    }
    
    // Helper methods for enhanced functionality
    sanitizeKey(key) {
        return key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    }
    
    generateChecksum(data) {
        try {
            const str = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString();
        } catch {
            return null;
        }
    }
    
    validateChecksum(data, checksum) {
        if (!checksum) return true; // Skip validation if no checksum
        return this.generateChecksum(data) === checksum;
    }
    
    compressData(data) {
        // Simple compression using repeated character replacement
        try {
            const compressed = data.replace(/(..)\\1+/g, (match, p1) => {
                return `${p1}*${match.length / p1.length}`;
            });
            return 'compressed:' + compressed;
        } catch {
            return data;
        }
    }
    
    decompressData(compressedData) {
        try {
            if (!compressedData.startsWith('compressed:')) {
                return compressedData;
            }
            
            const data = compressedData.substring(11); // Remove 'compressed:' prefix
            return data.replace(/(..)\\*(\\d+)/g, (match, p1, count) => {
                return p1.repeat(parseInt(count));
            });
        } catch {
            return compressedData;
        }
    }
    
    checkStorageQuota() {
        try {
            const testKey = 'quota_test';
            const testData = 'x'.repeat(1024); // 1KB test
            localStorage.setItem(testKey, testData);
            localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }
    
    handleQuotaExceeded() {
        console.warn('Storage quota exceeded, cleaning up old data');
        this.cleanupOldData();
    }
    
    cleanupOldData() {
        try {
            const items = [];
            
            // Collect all items with timestamps
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    try {
                        const item = localStorage.getItem(key);
                        const data = JSON.parse(item);
                        if (data.timestamp) {
                            items.push({ key, timestamp: data.timestamp, size: item.length });
                        }
                    } catch (e) {
                        // Remove corrupted items
                        localStorage.removeItem(key);
                    }
                }
            }
            
            // Sort by timestamp (oldest first)
            items.sort((a, b) => a.timestamp - b.timestamp);
            
            // Remove oldest 25% of items
            const removeCount = Math.ceil(items.length * 0.25);
            for (let i = 0; i < removeCount; i++) {
                localStorage.removeItem(items[i].key);
            }
            
            console.log(`Cleaned up ${removeCount} old items`);
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
    
    updateStorageStats(key, sizeChange) {
        try {
            const stats = this.getItem('_storage_stats', { totalSize: 0, itemCount: 0 });
            stats.totalSize += sizeChange;
            if (sizeChange > 0) {
                stats.itemCount++;
            } else if (sizeChange < 0) {
                stats.itemCount = Math.max(0, stats.itemCount - 1);
            }
            stats.lastUpdated = Date.now();
            this.setItem('_storage_stats', stats);
        } catch (error) {
            console.error('Error updating storage stats:', error);
        }
    }
    
    getStorageStats() {
        return this.getItem('_storage_stats', { totalSize: 0, itemCount: 0, lastUpdated: Date.now() });
    }
    
    migrateData(data, key) {
        try {
            // Handle version migrations
            if (data.version === '1.0' && this.version === '2.0') {
                // Example migration logic
                data.version = '2.0';
                data.migrated = true;
                data.migrationDate = Date.now();
                
                // Save migrated data
                this.setItem(key, data.value);
            }
            return data;
        } catch (error) {
            console.error('Data migration error:', error);
            return data;
        }
    }
}

// Enhanced Notification Manager
class NotificationManager {
    static notifications = [];
    static maxNotifications = 5;
    static defaultDuration = 3000;
    
    static show(message, type = 'info', duration = null) {
        // Validate inputs
        if (!message || typeof message !== 'string') {
            console.error('Invalid notification message');
            return;
        }
        
        // Sanitize message
        message = this.sanitizeMessage(message);
        
        // Set duration
        if (duration === null) {
            duration = type === 'error' ? 5000 : this.defaultDuration;
        }
        
        // Limit number of notifications
        if (this.notifications.length >= this.maxNotifications) {
            this.removeOldestNotification();
        }

        const notificationId = 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        // Create notification content safely
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        const icon = document.createElement('i');
        icon.className = `fas fa-${this.getIcon(type)}`;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message; // Safe text content
        
        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.setAttribute('aria-label', 'إغلاق الإشعار');
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.onclick = () => this.removeNotification(notificationId);
        
        content.appendChild(icon);
        content.appendChild(messageSpan);
        content.appendChild(closeButton);
        notification.appendChild(content);
        
        // Add to tracking
        this.notifications.push({
            id: notificationId,
            element: notification,
            timestamp: Date.now(),
            type: type
        });

        // Add styles if not exists
        this.updateStyles();

        // Position notification
        this.positionNotification(notification);
        document.body.appendChild(notification);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notificationId);
            }, duration);
        }
        
        // Log notification for debugging
        console.log(`Notification shown: ${type} - ${message}`);
        
        return notificationId;
    }
    
    static removeNotification(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && notification.element.parentElement) {
                notification.element.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (notification.element.parentElement) {
                        notification.element.remove();
                    }
                    this.notifications = this.notifications.filter(n => n.id !== notificationId);
                }, 300);
            }
        } catch (error) {
            console.error('Error removing notification:', error);
        }
    }
    
    static removeOldestNotification() {
        if (this.notifications.length > 0) {
            const oldest = this.notifications[0];
            this.removeNotification(oldest.id);
        }
    }
    
    static clearAll() {
        this.notifications.forEach(notification => {
            this.removeNotification(notification.id);
        });
    }
    
    static positionNotification(notification) {
        const existingNotifications = document.querySelectorAll('.notification');
        let topOffset = 20;
        
        existingNotifications.forEach(existing => {
            topOffset += existing.offsetHeight + 10;
        });
        
        notification.style.top = topOffset + 'px';
    }
    
    static sanitizeMessage(message) {
        return message.replace(/[<>"'&]/g, function(match) {
            const map = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return map[match];
        }).substring(0, 200); // Limit message length
    }
    
    static getIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }
    
    static updateStyles() {
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    right: 20px;
                    background: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 1rem;
                    color: white;
                    font-family: 'Cairo', sans-serif;
                    z-index: 10000;
                    animation: slideIn 0.3s ease-out;
                    min-width: 300px;
                    max-width: 500px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    word-wrap: break-word;
                }
                
                .notification-success { 
                    border-left: 4px solid #10b981;
                    background: rgba(16, 185, 129, 0.1);
                }
                .notification-error { 
                    border-left: 4px solid #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                }
                .notification-warning { 
                    border-left: 4px solid #f59e0b;
                    background: rgba(245, 158, 11, 0.1);
                }
                .notification-info { 
                    border-left: 4px solid #3b82f6;
                    background: rgba(59, 130, 246, 0.1);
                }
                
                .notification-content {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }
                
                .notification-content i {
                    margin-top: 2px;
                    flex-shrink: 0;
                }
                
                .notification-content span {
                    flex: 1;
                    line-height: 1.4;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                    flex-shrink: 0;
                    margin-top: -2px;
                }
                
                .notification-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                }
                
                .notification-close:focus {
                    outline: 2px solid rgba(255, 255, 255, 0.3);
                    outline-offset: 2px;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                
                @media (max-width: 768px) {
                    .notification {
                        right: 10px;
                        left: 10px;
                        min-width: auto;
                        max-width: none;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
}

// Enhanced Date and Time Utilities
class DateUtils {
    static cache = new Map();
    static cacheTimeout = 60000; // 1 minute cache

    static formatDate(date, locale = 'ar-EG', options = {}) {
        try {
            if (!date) return '';
            
            // Create cache key
            const cacheKey = `date_${date}_${locale}_${JSON.stringify(options)}`;
            const cached = this.getCached(cacheKey);
            if (cached) return cached;
            
            const defaultOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                ...options
            };
            
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid date');
            }
            
            const formatted = dateObj.toLocaleDateString(locale, defaultOptions);
            this.setCached(cacheKey, formatted);
            return formatted;
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'تاريخ غير صحيح';
        }
    }

    static formatTime(date, locale = 'ar-EG', options = {}) {
        try {
            if (!date) return '';
            
            const cacheKey = `time_${date}_${locale}_${JSON.stringify(options)}`;
            const cached = this.getCached(cacheKey);
            if (cached) return cached;
            
            const defaultOptions = {
                hour: '2-digit',
                minute: '2-digit',
                ...options
            };
            
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid date');
            }
            
            const formatted = dateObj.toLocaleTimeString(locale, defaultOptions);
            this.setCached(cacheKey, formatted);
            return formatted;
        } catch (error) {
            console.error('Time formatting error:', error);
            return 'وقت غير صحيح';
        }
    }

    static formatDateTime(date, locale = 'ar-EG', options = {}) {
        try {
            if (!date) return '';
            
            const cacheKey = `datetime_${date}_${locale}_${JSON.stringify(options)}`;
            const cached = this.getCached(cacheKey);
            if (cached) return cached;
            
            const defaultOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                ...options
            };
            
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid date');
            }
            
            const formatted = dateObj.toLocaleString(locale, defaultOptions);
            this.setCached(cacheKey, formatted);
            return formatted;
        } catch (error) {
            console.error('DateTime formatting error:', error);
            return 'تاريخ ووقت غير صحيح';
        }
    }
    
    static getCached(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.value;
        }
        this.cache.delete(key);
        return null;
    }
    
    static setCached(key, value) {
        // Limit cache size
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            value: value,
            timestamp: Date.now()
        });
    }
    
    static clearCache() {
        this.cache.clear();
    }

    static getCurrentBusinessDay() {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);
        
        if (now.getHours() < 8) {
            start.setDate(start.getDate() - 1);
            start.setHours(8, 0, 0, 0);
            end.setHours(8, 0, 0, 0);
        } else {
            start.setHours(8, 0, 0, 0);
            end.setDate(end.getDate() + 1);
            end.setHours(8, 0, 0, 0);
        }
        
        return { start, end };
    }

    static isBusinessHours() {
        const now = new Date();
        const hour = now.getHours();
        return hour >= 8 && hour < 20;
    }
}

// Enhanced Form Validation Utilities
class ValidationUtils {
    static validationRules = new Map();
    static customValidators = new Map();

    static validateRequired(value, fieldName) {
        if (value === null || value === undefined || value.toString().trim() === '') {
            throw new ValidationError(`${fieldName} مطلوب`, 'REQUIRED', fieldName);
        }
        return true;
    }

    static validateNumber(value, fieldName, options = {}) {
        const { min = null, max = null, allowDecimals = true, allowNegative = true } = options;
        
        if (value === '' || value === null || value === undefined) {
            if (options.required) {
                throw new ValidationError(`${fieldName} مطلوب`, 'REQUIRED', fieldName);
            }
            return null;
        }
        
        const num = parseFloat(value);
        if (isNaN(num)) {
            throw new ValidationError(`${fieldName} يجب أن يكون رقماً صحيحاً`, 'INVALID_NUMBER', fieldName);
        }
        
        if (!allowDecimals && num % 1 !== 0) {
            throw new ValidationError(`${fieldName} يجب أن يكون رقماً صحيحاً بدون كسور`, 'NO_DECIMALS', fieldName);
        }
        
        if (!allowNegative && num < 0) {
            throw new ValidationError(`${fieldName} يجب أن يكون رقماً موجباً`, 'NO_NEGATIVE', fieldName);
        }
        
        if (min !== null && num < min) {
            throw new ValidationError(`${fieldName} يجب أن يكون أكبر من أو يساوي ${min}`, 'MIN_VALUE', fieldName);
        }
        
        if (max !== null && num > max) {
            throw new ValidationError(`${fieldName} يجب أن يكون أقل من أو يساوي ${max}`, 'MAX_VALUE', fieldName);
        }
        
        return num;
    }

    static validateEmail(email, fieldName = 'البريد الإلكتروني') {
        if (!email || typeof email !== 'string') {
            throw new ValidationError(`${fieldName} مطلوب`, 'REQUIRED', fieldName);
        }
        
        const trimmedEmail = email.trim().toLowerCase();
        
        // More comprehensive email validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (!emailRegex.test(trimmedEmail)) {
            throw new ValidationError(`${fieldName} غير صحيح`, 'INVALID_EMAIL', fieldName);
        }
        
        if (trimmedEmail.length > 254) {
            throw new ValidationError(`${fieldName} طويل جداً`, 'EMAIL_TOO_LONG', fieldName);
        }
        
        return trimmedEmail;
    }

    static validatePhone(phone, fieldName = 'رقم الهاتف') {
        if (!phone || typeof phone !== 'string') {
            throw new ValidationError(`${fieldName} مطلوب`, 'REQUIRED', fieldName);
        }
        
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        
        // Egyptian phone number patterns
        const egyptianMobile = /^(\+20|0020|20)?1[0125][0-9]{8}$/;
        const egyptianLandline = /^(\+20|0020|20)?[2-9][0-9]{7,8}$/;
        const internationalPhone = /^\+[1-9][0-9]{6,14}$/;
        
        if (!egyptianMobile.test(cleanPhone) && 
            !egyptianLandline.test(cleanPhone) && 
            !internationalPhone.test(cleanPhone)) {
            throw new ValidationError(`${fieldName} غير صحيح`, 'INVALID_PHONE', fieldName);
        }
        
        return cleanPhone;
    }

    static sanitizeInput(input) {
        if (window.SecurityUtils) {
            return window.SecurityUtils.sanitizeInput(input);
        }
        
        // Fallback sanitization
        if (typeof input !== 'string') return '';
        return input.replace(/[<>"'&]/g, function(match) {
            const map = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return map[match];
        }).trim().substring(0, 1000);
    }
    
    static validateForm(formData, rules) {
        const errors = [];
        const validatedData = {};
        
        Object.keys(rules).forEach(fieldName => {
            try {
                const rule = rules[fieldName];
                const value = formData[fieldName];
                
                // Apply validation rules
                if (rule.required) {
                    this.validateRequired(value, rule.label || fieldName);
                }
                
                if (value && rule.type) {
                    switch (rule.type) {
                        case 'number':
                            validatedData[fieldName] = this.validateNumber(value, rule.label || fieldName, rule.options);
                            break;
                        case 'email':
                            validatedData[fieldName] = this.validateEmail(value, rule.label || fieldName);
                            break;
                        case 'phone':
                            validatedData[fieldName] = this.validatePhone(value, rule.label || fieldName);
                            break;
                        default:
                            validatedData[fieldName] = this.sanitizeInput(value);
                    }
                } else {
                    validatedData[fieldName] = this.sanitizeInput(value);
                }
                
                // Custom validator
                if (rule.validator && typeof rule.validator === 'function') {
                    rule.validator(validatedData[fieldName], fieldName);
                }
                
            } catch (error) {
                errors.push({
                    field: fieldName,
                    message: error.message,
                    code: error.code || 'VALIDATION_ERROR'
                });
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            data: validatedData
        };
    }
}

// Custom validation error class
class ValidationError extends Error {
    constructor(message, code, field) {
        super(message);
        this.name = 'ValidationError';
        this.code = code;
        this.field = field;
    }
}

// Export Utilities
class ExportUtils {
    static exportToJSON(data, filename) {
        try {
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            this.downloadFile(blob, filename + '.json');
            return true;
        } catch (error) {
            console.error('Error exporting JSON:', error);
            NotificationManager.show('خطأ في تصدير البيانات', 'error');
            return false;
        }
    }

    static exportToCSV(data, filename, headers = null) {
        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('لا توجد بيانات للتصدير');
            }

            let csv = '';
            
            // Add headers
            if (headers) {
                csv += headers.join(',') + '\n';
            } else if (data.length > 0) {
                csv += Object.keys(data[0]).join(',') + '\n';
            }

            // Add data rows
            data.forEach(row => {
                const values = Object.values(row).map(value => {
                    // Escape commas and quotes
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                });
                csv += values.join(',') + '\n';
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            this.downloadFile(blob, filename + '.csv');
            return true;
        } catch (error) {
            console.error('Error exporting CSV:', error);
            NotificationManager.show('خطأ في تصدير البيانات: ' + error.message, 'error');
            return false;
        }
    }

    static downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Performance Monitor
class PerformanceMonitor {
    static startTimer(label) {
        console.time(label);
    }

    static endTimer(label) {
        console.timeEnd(label);
    }

    static measureFunction(fn, label) {
        return function(...args) {
            PerformanceMonitor.startTimer(label);
            const result = fn.apply(this, args);
            PerformanceMonitor.endTimer(label);
            return result;
        };
    }

    static getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            };
        }
        return null;
    }
}

// Performance and Memory Management
class MemoryManager {
    static memoryThreshold = 50 * 1024 * 1024; // 50MB
    static cleanupInterval = 5 * 60 * 1000; // 5 minutes
    
    static startMonitoring() {
        setInterval(() => {
            this.checkMemoryUsage();
        }, this.cleanupInterval);
    }
    
    static checkMemoryUsage() {
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize;
            if (used > this.memoryThreshold) {
                this.performCleanup();
            }
        }
    }
    
    static performCleanup() {
        try {
            // Clear caches
            DateUtils.clearCache();
            
            // Clear old notifications
            NotificationManager.clearAll();
            
            // Trigger garbage collection if available
            if (window.gc) {
                window.gc();
            }
            
            console.log('Memory cleanup performed');
        } catch (error) {
            console.error('Memory cleanup error:', error);
        }
    }
}

// Initialize memory monitoring
MemoryManager.startMonitoring();

// Initialize global instances
const db = new DatabaseManager();
const notify = NotificationManager;

// Make utilities available globally
window.DatabaseManager = DatabaseManager;
window.NotificationManager = NotificationManager;
window.DateUtils = DateUtils;
window.ValidationUtils = ValidationUtils;
window.ValidationError = ValidationError;
window.ExportUtils = ExportUtils;
window.PerformanceMonitor = PerformanceMonitor;
window.MemoryManager = MemoryManager;
window.db = db;
window.notify = notify;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DatabaseManager,
        NotificationManager,
        DateUtils,
        ValidationUtils,
        ValidationError,
        ExportUtils,
        PerformanceMonitor,
        MemoryManager
    };
}