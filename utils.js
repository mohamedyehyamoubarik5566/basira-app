// Utility Functions for Better Code Organization
class DatabaseManager {
    constructor() {
        this.prefix = 'basira_';
        this.version = '2.0';
    }

    // Safe localStorage operations with error handling
    setItem(key, value) {
        try {
            const data = {
                value: value,
                timestamp: Date.now(),
                version: this.version
            };
            localStorage.setItem(this.prefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            NotificationManager.show('خطأ في حفظ البيانات', 'error');
            return false;
        }
    }

    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) return defaultValue;
            
            const data = JSON.parse(item);
            
            // Check version compatibility
            if (data.version !== this.version) {
                console.warn(`Version mismatch for ${key}. Expected ${this.version}, got ${data.version}`);
            }
            
            return data.value;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    removeItem(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // Backup and restore functionality
    backup() {
        try {
            const backup = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.prefix)) {
                    backup[key] = localStorage.getItem(key);
                }
            }
            return JSON.stringify(backup);
        } catch (error) {
            console.error('Error creating backup:', error);
            return null;
        }
    }

    restore(backupData) {
        try {
            const data = JSON.parse(backupData);
            Object.keys(data).forEach(key => {
                localStorage.setItem(key, data[key]);
            });
            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }
}

// Notification Manager
class NotificationManager {
    static show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add styles if not exists
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
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
                }
                
                .notification-success { border-left: 4px solid #10b981; }
                .notification-error { border-left: 4px solid #ef4444; }
                .notification-warning { border-left: 4px solid #f59e0b; }
                .notification-info { border-left: 4px solid #3b82f6; }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    margin-left: auto;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                
                .notification-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
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
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideIn 0.3s ease-out reverse';
                    setTimeout(() => {
                        if (notification.parentElement) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
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
}

// Date and Time Utilities
class DateUtils {
    static formatDate(date, locale = 'ar-EG') {
        return new Date(date).toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static formatTime(date, locale = 'ar-EG') {
        return new Date(date).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatDateTime(date, locale = 'ar-EG') {
        return new Date(date).toLocaleString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static getCurrentBusinessDay() {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);
        
        if (now.getHours() < AppConfig.app.businessHours.start) {
            start.setDate(start.getDate() - 1);
            start.setHours(AppConfig.app.businessHours.start, 0, 0, 0);
            end.setHours(AppConfig.app.businessHours.start, 0, 0, 0);
        } else {
            start.setHours(AppConfig.app.businessHours.start, 0, 0, 0);
            end.setDate(end.getDate() + 1);
            end.setHours(AppConfig.app.businessHours.start, 0, 0, 0);
        }
        
        return { start, end };
    }

    static isBusinessHours() {
        const now = new Date();
        const hour = now.getHours();
        return hour >= AppConfig.app.businessHours.start && hour < AppConfig.app.businessHours.end;
    }
}

// Form Validation Utilities
class ValidationUtils {
    static validateRequired(value, fieldName) {
        if (!value || value.toString().trim() === '') {
            throw new Error(`${fieldName} مطلوب`);
        }
        return true;
    }

    static validateNumber(value, fieldName, min = null, max = null) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            throw new Error(`${fieldName} يجب أن يكون رقماً صحيحاً`);
        }
        if (min !== null && num < min) {
            throw new Error(`${fieldName} يجب أن يكون أكبر من ${min}`);
        }
        if (max !== null && num > max) {
            throw new Error(`${fieldName} يجب أن يكون أقل من ${max}`);
        }
        return num;
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('البريد الإلكتروني غير صحيح');
        }
        return true;
    }

    static validatePhone(phone) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(phone)) {
            throw new Error('رقم الهاتف غير صحيح');
        }
        return true;
    }

    static sanitizeInput(input) {
        return SecurityUtils.sanitizeInput(input);
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

// Initialize global instances
const db = new DatabaseManager();
const notify = NotificationManager;

// Make utilities available globally
window.DatabaseManager = DatabaseManager;
window.NotificationManager = NotificationManager;
window.DateUtils = DateUtils;
window.ValidationUtils = ValidationUtils;
window.ExportUtils = ExportUtils;
window.PerformanceMonitor = PerformanceMonitor;
window.db = db;
window.notify = notify;