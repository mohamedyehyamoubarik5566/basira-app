// Global Variables
let allTodaySales = [];
let allClients = [];
let currentUser = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check authentication
    checkAuth();
    
    // Initialize navigation
    initializeNavigation();
    
    // Update date
    updateCurrentDate();
    
    // Load dashboard
    loadDashboard();
}

function checkAuth() {
    const session = localStorage.getItem('currentUser');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(session);
        updateUserInfo();
    } catch (e) {
        console.error('Error parsing user session:', e);
        window.location.href = 'login.html';
    }
}

function updateUserInfo() {
    if (currentUser) {
        const nameElement = document.getElementById('currentUserName');
        const roleElement = document.getElementById('currentUserRole');
        
        if (nameElement) nameElement.textContent = currentUser.companyName || currentUser.username || 'المستخدم';
        if (roleElement) roleElement.textContent = getUserRoleText(currentUser.role);
    }
}

function getUserRoleText(role) {
    switch(role) {
        case 'admin': return 'مدير النظام';
        case 'developer': return 'مطور';
        case 'manager': return 'مدير';
        default: return 'مستخدم';
    }
}

function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Skip external links
            if (this.href && (this.href.includes('staff.html') || this.href.includes('control-panel.html'))) {
                return;
            }
            
            const section = this.dataset.section;
            if (section) {
                navigateToSection(section);
            }
        });
    });
}

function navigateToSection(sectionName) {
    // Update active navigation
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    
    const navItem = document.querySelector(`[data-section="${sectionName}"]`);
    const section = document.getElementById(`${sectionName}-section`);
    
    if (navItem && section) {
        navItem.classList.add('active');
        section.classList.add('active');
        
        // Update page title
        const titleElement = document.getElementById('pageTitle');
        if (titleElement) {
            titleElement.textContent = navItem.textContent.trim();
        }
        
        // Load section data
        loadSectionData(sectionName);
    }
}

function loadSectionData(sectionName) {
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'sales':
            loadSales();
            break;
        case 'clients':
            loadClients();
            break;
        case 'purchases':
            loadPurchases();
            break;
        case 'budget':
            loadBudget();
            break;
        case 'treasury':
            loadTreasury();
            break;
        case 'daily-report':
            loadDailyReport();
            break;
        case 'bank':
            loadBankManagement();
            break;
        case 'vehicles':
            loadVehicles();
            break;
    }
}

function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        dateElement.textContent = now.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Dashboard Functions
function loadDashboard() {
    updateDashboardStats();
    loadRecentActivity();
}

function updateDashboardStats() {
    // Get today's sales
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    const today = new Date().toDateString();
    const todayPermissions = permissions.filter(p => new Date(p.date).toDateString() === today);
    
    const totalSales = todayPermissions.reduce((sum, p) => sum + parseFloat(p.totalPrice || 0), 0);
    const totalOrders = todayPermissions.length;
    
    // Get clients count
    const clients = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
    const totalClients = Object.keys(clients).length;
    
    // Get treasury balance
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const totalBalance = transactions.reduce((balance, t) => {
        return t.type === 'income' ? balance + t.amount : balance - t.amount;
    }, 0);
    
    // Update display
    updateElementText('dashboardTotalSales', `${totalSales.toFixed(2)} ج.م`);
    updateElementText('dashboardTotalClients', totalClients);
    updateElementText('dashboardTotalOrders', totalOrders);
    updateElementText('dashboardTotalBalance', `${totalBalance.toFixed(2)} ج.م`);
}

function loadRecentActivity() {
    const activityList = document.getElementById('recentActivityList');
    if (!activityList) return;
    
    const activities = [];
    
    // Add recent sales
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    permissions.forEach(p => {
        activities.push({
            text: `مبيعة جديدة للعميل ${p.clientName} بقيمة ${parseFloat(p.totalPrice).toFixed(2)} ج.م`,
            time: new Date(p.date),
            icon: 'fas fa-shopping-cart'
        });
    });
    
    if (activities.length === 0) {
        activityList.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.7);">لا توجد أنشطة حديثة</div>';
        return;
    }
    
    activityList.innerHTML = activities.map(activity => `
        <div style="display: flex; align-items: center; padding: 1rem; background: rgba(255,255,255,0.1); border-radius: 8px; margin-bottom: 1rem;">
            <i class="${activity.icon}" style="margin-left: 1rem; color: #4CAF50;"></i>
            <div>
                <div style="color: white;">${activity.text}</div>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">${getTimeAgo(activity.time)}</div>
            </div>
        </div>
    `).join('');
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
}

function refreshActivity() {
    loadRecentActivity();
    updateDashboardStats();
    showNotification('تم تحديث النشاط الأخير!');
}

// Sales Functions
function loadSales() {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    allTodaySales = permissions;
    renderSalesTable();
}

function renderSalesTable() {
    const tbody = document.getElementById('salesTable');
    if (!tbody) return;
    
    if (allTodaySales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">لا توجد مبيعات</td></tr>';
        return;
    }
    
    tbody.innerHTML = allTodaySales.map(sale => {
        const date = new Date(sale.date);
        const time = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <tr>
                <td>${sale.permissionNumber || ''}</td>
                <td>${sale.clientName || ''}</td>
                <td>${sale.carNumber || ''}</td>
                <td>${sale.materialType || 'سن'}</td>
                <td>${sale.volume || 0} م³</td>
                <td>${sale.pricePerMeter || 0} ج.م</td>
                <td>${sale.totalPrice || 0} ج.م</td>
                <td>${time}</td>
                <td>
                    <button onclick="editPermission(${sale.id})" style="background: #4CAF50; color: white; border: none; padding: 0.5rem; border-radius: 5px; margin: 0 0.25rem; cursor: pointer;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deletePermission(${sale.id})" style="background: #f44336; color: white; border: none; padding: 0.5rem; border-radius: 5px; margin: 0 0.25rem; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Clients Functions
function loadClients() {
    const clients = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
    allClients = Object.values(clients);
    renderClientsGrid();
}

function renderClientsGrid() {
    const grid = document.getElementById('clientsGrid');
    if (!grid) return;
    
    if (allClients.length === 0) {
        grid.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.7);">لا توجد عملاء مضافين</div>';
        return;
    }
    
    grid.innerHTML = allClients.map(client => `
        <div style="background: rgba(255,255,255,0.1); border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem;">
            <h3 style="color: white; margin-bottom: 0.5rem;">${client.name}</h3>
            <p style="color: rgba(255,255,255,0.8);">${client.phone || 'لا يوجد رقم'}</p>
            <div style="margin-top: 1rem;">
                <span style="color: rgba(255,255,255,0.8);">سعر السن: ${client.priceSen || 0} ج.م</span><br>
                <span style="color: rgba(255,255,255,0.8);">سعر العدسة: ${client.priceAdasa || 0} ج.م</span>
            </div>
        </div>
    `).join('');
}

// Modal Functions
function openPermissionModal() {
    const modal = document.getElementById('permissionModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closePermissionModal() {
    const modal = document.getElementById('permissionModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        document.getElementById('permissionForm').reset();
    }
}

function openClientModal() {
    const modal = document.getElementById('clientModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeClientModal() {
    const modal = document.getElementById('clientModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        document.getElementById('clientForm').reset();
    }
}

// Form Handlers
document.addEventListener('DOMContentLoaded', function() {
    const permissionForm = document.getElementById('permissionForm');
    if (permissionForm) {
        permissionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            savePermission();
        });
    }
    
    const clientForm = document.getElementById('clientForm');
    if (clientForm) {
        clientForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveClient();
        });
    }
});

function savePermission() {
    const formData = {
        id: Date.now(),
        clientName: document.getElementById('clientName').value,
        permissionNumber: document.getElementById('permissionNumber').value,
        carNumber: document.getElementById('carNumber').value,
        materialType: document.getElementById('materialType').value,
        volume: parseFloat(document.getElementById('volume').value),
        pricePerMeter: parseFloat(document.getElementById('pricePerMeter').value),
        totalPrice: (parseFloat(document.getElementById('volume').value) * parseFloat(document.getElementById('pricePerMeter').value)).toFixed(2),
        date: new Date().toISOString()
    };
    
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    permissions.push(formData);
    localStorage.setItem('permissions', JSON.stringify(permissions));
    
    closePermissionModal();
    loadSales();
    showNotification('تم حفظ الإذن بنجاح!');
}

function saveClient() {
    const clientName = document.getElementById('clientNameInput').value;
    const clientData = {
        name: clientName,
        phone: document.getElementById('clientPhone').value,
        priceSen: parseFloat(document.getElementById('clientPriceSen').value) || 0,
        priceAdasa: parseFloat(document.getElementById('clientPriceAdasa').value) || 0,
        createdAt: new Date().toISOString()
    };
    
    const clients = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
    clients[clientName] = clientData;
    localStorage.setItem('clientsDatabase', JSON.stringify(clients));
    
    closeClientModal();
    loadClients();
    showNotification('تم حفظ العميل بنجاح!');
}

// Utility Functions
function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 9999;
        font-weight: 600;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showDeveloperInfo() {
    alert('نظام إدارة الموارد\nتطوير: شركة البصيرة للتقنية\nالإصدار: 2.0.0');
}

function logout() {
    localStorage.removeItem('currentUser');
    showNotification('تم تسجيل الخروج بنجاح');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// Placeholder functions for other sections
function loadPurchases() { console.log('Loading purchases...'); }
function loadBudget() { console.log('Loading budget...'); }
function loadTreasury() { console.log('Loading treasury...'); }
function loadDailyReport() { console.log('Loading daily report...'); }
function loadBankManagement() { console.log('Loading bank management...'); }
function loadVehicles() { console.log('Loading vehicles...'); }
function editPermission(id) { console.log('Edit permission:', id); }
function deletePermission(id) { console.log('Delete permission:', id); }

// Make functions globally available
window.navigateToSection = navigateToSection;
window.openPermissionModal = openPermissionModal;
window.closePermissionModal = closePermissionModal;
window.openClientModal = openClientModal;
window.closeClientModal = closeClientModal;
window.showDeveloperInfo = showDeveloperInfo;
window.logout = logout;
window.refreshActivity = refreshActivity;
window.editPermission = editPermission;
window.deletePermission = deletePermission;