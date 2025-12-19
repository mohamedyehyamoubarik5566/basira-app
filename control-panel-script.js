// Global Variables
let currentView = 'developer';
let isDarkMode = true;
let companies = [
    { name: 'شركة البصيرة للتجارة', code: 'BSR001', status: 'active' }
];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    updateStats();
    setInterval(updateStats, 5000); // Update every 5 seconds
});

// Sidebar Functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function switchView(view) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Update content
    document.querySelectorAll('.view-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(view + '-view').classList.add('active');
    
    // Update header
    const titles = {
        developer: { title: 'عرض المطور', subtitle: 'إدارة النظام والشركات' },
        company: { title: 'إدارة الشركة', subtitle: 'تخصيص العلامة التجارية والصلاحيات' },
        monitor: { title: 'مراقب النظام', subtitle: 'مراقبة الأداء والإحصائيات' },
        settings: { title: 'الإعدادات', subtitle: 'إعدادات النظام العامة' }
    };
    
    document.getElementById('pageTitle').textContent = titles[view].title;
    document.getElementById('pageSubtitle').textContent = titles[view].subtitle;
    
    currentView = view;
}

// Theme Toggle
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode');
    
    const themeBtn = document.querySelector('.theme-toggle');
    const icon = themeBtn.querySelector('i');
    const text = themeBtn.querySelector('span');
    
    if (isDarkMode) {
        icon.className = 'fas fa-moon';
        text.textContent = 'الوضع المظلم';
    } else {
        icon.className = 'fas fa-sun';
        text.textContent = 'الوضع المضيء';
    }
}

// Developer Functions
function createCompany() {
    const name = document.getElementById('companyName').value;
    const code = document.getElementById('companyCode').value;
    
    if (!name || !code) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    // Check if company code exists
    if (companies.find(c => c.code === code)) {
        showToast('كود الشركة موجود بالفعل', 'error');
        return;
    }
    
    // Add company
    companies.push({
        name: name,
        code: code,
        status: 'active'
    });
    
    // Create database (simulation)
    createCompanyDatabase(code);
    
    // Update UI
    updateCompanyList();
    updateLicenseDropdown();
    
    // Clear form
    document.getElementById('companyName').value = '';
    document.getElementById('companyCode').value = '';
    
    showToast(`تم إنشاء شركة ${name} بنجاح`, 'success');
}

function createCompanyDatabase(companyCode) {
    // Simulate database creation
    console.log(`Creating database for company: ${companyCode}`);
    
    // In real implementation, this would make an API call to create SQL database
    const dbName = `company_${companyCode.toLowerCase()}`;
    localStorage.setItem(`db_${companyCode}`, JSON.stringify({
        name: dbName,
        created: new Date().toISOString(),
        tables: ['users', 'sales', 'inventory', 'reports']
    }));
}

function updateCompanyList() {
    const list = document.getElementById('companyList');
    list.innerHTML = '';
    
    companies.forEach(company => {
        const item = document.createElement('div');
        item.className = 'company-item';
        item.innerHTML = `
            <span>${company.name}</span>
            <span class="status ${company.status}">${company.status === 'active' ? 'نشط' : 'غير نشط'}</span>
        `;
        list.appendChild(item);
    });
}

function updateLicenseDropdown() {
    const select = document.getElementById('licenseCompany');
    select.innerHTML = '<option>اختر الشركة</option>';
    
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.code;
        option.textContent = company.name;
        select.appendChild(option);
    });
}

function generateLicense() {
    const companyCode = document.getElementById('licenseCompany').value;
    const expiryDate = document.getElementById('expiryDate').value;
    
    if (!companyCode || companyCode === 'اختر الشركة' || !expiryDate) {
        showToast('يرجى اختيار الشركة وتاريخ الانتهاء', 'error');
        return;
    }
    
    // Generate unique license key
    const licenseKey = generateUniqueKey(companyCode);
    
    // Store license
    const license = {
        key: licenseKey,
        companyCode: companyCode,
        expiryDate: expiryDate,
        issued: new Date().toISOString()
    };
    
    localStorage.setItem(`license_${companyCode}`, JSON.stringify(license));
    
    // Display license
    document.getElementById('licenseOutput').innerHTML = `
        <strong>مفتاح الترخيص:</strong><br>
        <code>${licenseKey}</code><br>
        <small>صالح حتى: ${expiryDate}</small>
    `;
    
    showToast('تم إصدار الترخيص بنجاح', 'success');
}

function generateUniqueKey(companyCode) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${companyCode}-${timestamp}-${random}`.toUpperCase();
}

// Company Manager Functions
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const logoPreview = document.getElementById('logoPreview');
        logoPreview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
        
        // Store logo
        localStorage.setItem('companyLogo', e.target.result);
        showToast('تم رفع الشعار بنجاح', 'success');
    };
    reader.readAsDataURL(file);
}

function updateLogoPosition() {
    const position = document.querySelector('input[name="logoPos"]:checked')?.value;
    const mockupHeader = document.querySelector('.mockup-header');
    
    if (!position) return;
    
    switch(position) {
        case 'left':
            mockupHeader.style.justifyContent = 'flex-start';
            break;
        case 'center':
            mockupHeader.style.justifyContent = 'center';
            mockupHeader.style.flexDirection = 'column';
            break;
        case 'beside':
            mockupHeader.style.justifyContent = 'flex-start';
            mockupHeader.style.flexDirection = 'row';
            break;
    }
    
    localStorage.setItem('logoPosition', position);
}

function updatePrimaryColor() {
    const color = document.getElementById('primaryColor').value;
    document.documentElement.style.setProperty('--primary-color', color);
    localStorage.setItem('primaryColor', color);
    showToast('تم تحديث اللون الأساسي', 'success');
}

function updateFontSize() {
    const size = document.getElementById('fontSize').value;
    document.documentElement.style.setProperty('--font-size', size + 'px');
    document.getElementById('fontSizeValue').textContent = size + 'px';
    localStorage.setItem('fontSize', size);
}

// Biometric Functions
async function registerBiometric() {
    showToast('جاري تسجيل البصمة...', 'info');
    
    try {
        // Simulate biometric registration
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const biometricId = 'bio_' + Date.now();
        const biometricData = {
            id: biometricId,
            registered: new Date().toISOString(),
            role: 'محاسب' // Default role
        };
        
        localStorage.setItem(`biometric_${biometricId}`, JSON.stringify(biometricData));
        showToast('تم تسجيل البصمة بنجاح', 'success');
        
    } catch (error) {
        showToast('فشل في تسجيل البصمة', 'error');
    }
}

// Utility Functions
function updateStats() {
    // Simulate real-time stats
    const activeCompanies = companies.length;
    const activeUsers = Math.floor(Math.random() * 50) + 200;
    
    document.getElementById('activeCompanies').textContent = activeCompanies;
    document.getElementById('activeUsers').textContent = activeUsers;
    
    // Update monitor values
    const serverPerf = Math.floor(Math.random() * 10) + 90;
    const memoryUsage = (Math.random() * 1 + 1.5).toFixed(1);
    const temperature = Math.floor(Math.random() * 10) + 40;
    
    document.querySelector('.monitor-item:nth-child(1) .monitor-value').textContent = serverPerf + '%';
    document.querySelector('.monitor-item:nth-child(2) .monitor-value').textContent = memoryUsage + 'GB';
    document.querySelector('.monitor-item:nth-child(3) .monitor-value').textContent = temperature + '°C';
    
    // Update progress bars
    document.querySelector('.monitor-item:nth-child(1) .progress').style.width = serverPerf + '%';
    document.querySelector('.monitor-item:nth-child(2) .progress').style.width = (memoryUsage / 4 * 100) + '%';
    document.querySelector('.monitor-item:nth-child(3) .progress').style.width = (temperature / 100 * 100) + '%';
}

function loadUserData() {
    // Load saved settings
    const savedColor = localStorage.getItem('primaryColor');
    if (savedColor) {
        document.getElementById('primaryColor').value = savedColor;
        updatePrimaryColor();
    }
    
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        document.getElementById('fontSize').value = savedFontSize;
        updateFontSize();
    }
    
    const savedLogo = localStorage.getItem('companyLogo');
    if (savedLogo) {
        document.getElementById('logoPreview').innerHTML = `<img src="${savedLogo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
    }
    
    const savedPosition = localStorage.getItem('logoPosition');
    if (savedPosition) {
        document.querySelector(`input[name="logoPos"][value="${savedPosition}"]`).checked = true;
        updateLogoPosition();
    }
    
    // Update company list
    updateCompanyList();
    updateLicenseDropdown();
}

// Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${getToastIcon(type)}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Add styles if not exists
    if (!document.querySelector('#toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                left: 20px;
                background: var(--glass-bg);
                backdrop-filter: blur(20px);
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                padding: 16px 20px;
                color: var(--text-primary);
                font-family: 'Cairo', sans-serif;
                font-size: 14px;
                z-index: 10000;
                animation: toastSlide 0.3s ease-out;
                min-width: 300px;
            }
            
            .toast-success { border-left: 4px solid #4CAF50; }
            .toast-error { border-left: 4px solid #f44336; }
            .toast-info { border-left: 4px solid var(--primary-color); }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .toast-icon {
                font-size: 18px;
            }
            
            @keyframes toastSlide {
                from {
                    transform: translateX(-100%);
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
    
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease-out reverse';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// Mobile Responsiveness
function handleMobileMenu() {
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('mobile-open');
    }
}

// Event Listeners
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.remove('mobile-open');
    }
});

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                switchView('developer');
                break;
            case '2':
                e.preventDefault();
                switchView('company');
                break;
            case '3':
                e.preventDefault();
                switchView('monitor');
                break;
            case 't':
                e.preventDefault();
                toggleTheme();
                break;
        }
    }
});