// Main Application Script - Fixed and Optimized

// Global Variables with Security
let allTodaySales = [];
let allClients = [];
let allChecks = [];
let allVehicleRecords = [];
let dailyReportData = [];
let allTransactions = [];
let currentTransactionType = '';
let allPurchases = [];
let allSuppliers = [];

// Security: Input sanitization function
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
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
        .substring(0, 200); // Limit length
}

// Enhanced error handling for DOM elements
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

// Security Check and User Info
document.addEventListener('DOMContentLoaded', function() {
    const session = localStorage.getItem('currentUser');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update user info in sidebar
    try {
        const user = JSON.parse(session);
        const userNameEl = safeGetElement('currentUserName');
        const userRoleEl = safeGetElement('currentUserRole');
        
        if (userNameEl) {
            userNameEl.textContent = user.companyName || user.username || 'المستخدم';
        }
        if (userRoleEl) {
            userRoleEl.textContent = user.role === 'admin' ? 'مدير النظام' : 
                user.role === 'developer' ? 'مطور' : 'مدير الشركة';
        }
        
        // Update company branding
        if (user.companyName) {
            const headerEl = document.querySelector('.sidebar-header h4');
            const subtitleEl = document.querySelector('.sidebar-header .subtitle');
            if (headerEl) headerEl.textContent = user.companyName;
            if (subtitleEl) subtitleEl.textContent = 'نظام إدارة الموارد';
        }
    } catch (e) {
        console.error('Error parsing user session:', e);
    }
});

// Logout function
function logout() {
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('lastCompanyCode');
    showNotification('تم تسجيل الخروج بنجاح');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// Make logout function globally available
window.logout = logout;

// Update version display
document.addEventListener('DOMContentLoaded', function() {
    const versionElement = safeGetElement('appVersion');
    if (versionElement) {
        // Wait for SystemConfig to be available
        if (typeof SystemConfig !== 'undefined' && SystemConfig.version) {
            versionElement.textContent = SystemConfig.version.current || '2.0.1';
        } else {
            versionElement.textContent = '2.0.1';
        }
    }
});

// Developer info function
function showDeveloperInfo() {
    alert('نظام إدارة الموارد \nتطوير: شركة البصيرة للتقنية\nالإصدار: 2.0.0');
}

window.showDeveloperInfo = showDeveloperInfo;

// Navigation
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            
            // Skip if it's an external link
            if (item.href && (item.href.includes('staff.html') || item.href.includes('control-panel.html'))) {
                return;
            }
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            const section = item.dataset.section;
            if (!section) return;
            
            const sectionElement = document.getElementById(section + '-section');
            if (!sectionElement) return;
            
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            sectionElement.classList.add('active');
            
            const pageTitleEl = safeGetElement('pageTitle');
            if (pageTitleEl) {
                pageTitleEl.textContent = item.textContent.trim();
            }
            
            // Load section data
            switch(section) {
                case 'sales':
                    if (typeof loadSales === 'function') loadSales();
                    break;
                case 'purchases':
                    if (typeof loadPurchases === 'function') loadPurchases();
                    break;
                case 'budget':
                    if (typeof loadBudget === 'function') loadBudget();
                    break;
                case 'treasury':
                    if (typeof loadTreasury === 'function') loadTreasury();
                    break;
                case 'vehicles':
                    if (typeof loadVehicles === 'function') loadVehicles();
                    break;
                case 'daily-report':
                    if (typeof loadDailyReport === 'function') loadDailyReport();
                    break;
                case 'bank':
                    if (typeof loadBankManagement === 'function') loadBankManagement();
                    break;
                case 'dashboard':
                    if (typeof loadDashboard === 'function') loadDashboard();
                    break;
                case 'clients':
                    setTimeout(() => {
                        if (typeof loadClients === 'function') loadClients();
                    }, 50);
                    break;
            }
        };
    });
});

// Date update
function updateDate() {
    const currentDateEl = safeGetElement('currentDate');
    if (currentDateEl) {
        currentDateEl.textContent = 
            new Date().toLocaleDateString('ar-EG', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    
    // Initialize dashboard after a short delay
    setTimeout(() => {
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
    }, 500);
});

// Notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                   type === 'warning' ? 'rgba(251, 191, 36, 0.9)' : 
                   'rgba(34, 197, 94, 0.9)';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 2rem;
        border-radius: 12px;
        z-index: 9999;
        backdrop-filter: blur(10px);
        font-family: 'Cairo', sans-serif;
        font-weight: 600;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Make functions globally available
window.showNotification = showNotification;
window.sanitizeInput = sanitizeInput;
window.safeGetElement = safeGetElement;

// Modal management
function openClientModal() {
    const modal = safeGetElement('clientModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeClientModal() {
    const modal = safeGetElement('clientModal');
    const form = safeGetElement('clientForm');
    
    if (modal) {
        modal.classList.remove('show');
    }
    
    document.body.style.overflow = 'auto';
    
    if (form) {
        form.reset();
        form.removeAttribute('data-edit-client');
    }
    
    // Reset modal title
    const modalTitle = safeGetElement('clientModalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'إضافة عميل جديد';
    }
}

function closeCheckModal() {
    const modal = safeGetElement('checkModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Make modal functions globally available
window.openClientModal = openClientModal;
window.closeClientModal = closeClientModal;
window.closeCheckModal = closeCheckModal;

// Error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    showNotification('حدث خطأ في التطبيق. يرجى إعادة تحميل الصفحة.', 'error');
});

// Performance optimization
document.addEventListener('DOMContentLoaded', function() {
    // Defer non-critical operations
    setTimeout(() => {
        // Initialize performance monitoring if available
        if (typeof performanceOptimizer !== 'undefined') {
            console.log('Performance optimizer initialized');
        }
    }, 1000);
});