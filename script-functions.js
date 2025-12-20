// Additional Application Functions

// Dashboard Functions
function loadDashboard() {
    updateDashboardStats();
    loadRecentActivity();
    updateSystemInfo();
}

function updateDashboardStats() {
    try {
        const {start, end} = getCurrentDayRange();
        const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
        const todayPermissions = permissions.filter(p => {
            const date = new Date(p.date);
            return date >= start && date < end;
        });
        
        const totalSales = todayPermissions.reduce((sum, p) => sum + parseFloat(p.totalPrice || 0), 0);
        const totalOrders = todayPermissions.length;
        
        const clients = getClientsDatabase();
        const totalClients = Object.keys(clients).length;
        
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        const totalBalance = transactions.reduce((balance, t) => {
            return t.type === 'income' ? balance + t.amount : balance - t.amount;
        }, 0);
        
        // Update display
        const dashboardTotalSalesEl = safeGetElement('dashboardTotalSales');
        const dashboardTotalClientsEl = safeGetElement('dashboardTotalClients');
        const dashboardTotalOrdersEl = safeGetElement('dashboardTotalOrders');
        const dashboardTotalBalanceEl = safeGetElement('dashboardTotalBalance');
        
        if (dashboardTotalSalesEl) dashboardTotalSalesEl.textContent = `${totalSales.toFixed(2)} ج.م`;
        if (dashboardTotalClientsEl) dashboardTotalClientsEl.textContent = totalClients;
        if (dashboardTotalOrdersEl) dashboardTotalOrdersEl.textContent = totalOrders;
        if (dashboardTotalBalanceEl) dashboardTotalBalanceEl.textContent = `${totalBalance.toFixed(2)} ج.م`;
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

function loadRecentActivity() {
    try {
        const activityList = safeGetElement('recentActivityList');
        if (!activityList) return;
        
        const activities = [];
        
        // Add recent sales
        const permissions = JSON.parse(localStorage.getItem('permissions') || '[]')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        permissions.forEach(p => {
            activities.push({
                type: 'sale',
                text: `مبيعة جديدة للعميل ${p.clientName} بقيمة ${parseFloat(p.totalPrice).toFixed(2)} ج.م`,
                time: new Date(p.date),
                icon: 'fas fa-shopping-cart'
            });
        });
        
        if (activities.length === 0) {
            activityList.innerHTML = '<div class="no-activity">لا توجد أنشطة حديثة</div>';
            return;
        }
        
        activityList.innerHTML = activities.slice(0, 8).map(activity => {
            const timeAgo = getTimeAgo(activity.time);
            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">${activity.text}</div>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        const activityList = safeGetElement('recentActivityList');
        if (activityList) {
            activityList.innerHTML = '<div class="no-activity">خطأ في تحميل النشاط الأخير</div>';
        }
    }
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

function updateSystemInfo() {
    try {
        const session = sessionStorage.getItem('currentUser');
        if (session) {
            const user = JSON.parse(session);
            const currentUserDisplayEl = safeGetElement('currentUserDisplay');
            if (currentUserDisplayEl) {
                currentUserDisplayEl.textContent = user.companyName || user.username || 'المستخدم';
            }
        }
        
        if (typeof SystemConfig !== 'undefined' && SystemConfig.version) {
            const systemVersionEl = safeGetElement('systemVersion');
            if (systemVersionEl) {
                systemVersionEl.textContent = SystemConfig.version.current || '2.0.1';
            }
        }
    } catch (error) {
        console.error('Error updating system info:', error);
    }
}

function getCurrentDayRange() {
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
    return {start, end};
}

function getClientsDatabase() {
    const session = sessionStorage.getItem('currentUser');
    const user = session ? JSON.parse(session) : null;
    const companyCode = user?.companyCode || 'default';
    return JSON.parse(localStorage.getItem(`clientsDatabase_${companyCode}`) || '{}');
}

function navigateToSection(sectionName) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    
    const navItem = document.querySelector(`[data-section="${sectionName}"]`);
    const section = document.getElementById(`${sectionName}-section`);
    
    if (navItem && section) {
        navItem.classList.add('active');
        section.classList.add('active');
        const pageTitleEl = safeGetElement('pageTitle');
        if (pageTitleEl) {
            pageTitleEl.textContent = navItem.textContent.trim();
        }
        
        // Load section data
        switch(sectionName) {
            case 'sales':
                if (typeof loadSales === 'function') loadSales();
                break;
            case 'clients':
                setTimeout(() => {
                    if (typeof loadClients === 'function') loadClients();
                }, 50);
                break;
            case 'treasury':
                if (typeof loadTreasury === 'function') loadTreasury();
                break;
            case 'daily-report':
                if (typeof loadDailyReport === 'function') loadDailyReport();
                break;
        }
    }
}

function refreshActivity() {
    loadRecentActivity();
    updateDashboardStats();
    showNotification('تم تحديث النشاط الأخير!');
}

// Placeholder functions for sections not yet implemented
function loadSales() {
    console.log('Sales section loaded');
}

function loadClients() {
    console.log('Clients section loaded');
}

function loadTreasury() {
    console.log('Treasury section loaded');
}

function loadDailyReport() {
    console.log('Daily report section loaded');
}

function loadPurchases() {
    console.log('Purchases section loaded');
}

function loadBudget() {
    console.log('Budget section loaded');
}

function loadVehicles() {
    console.log('Vehicles section loaded');
}

function loadBankManagement() {
    console.log('Bank management section loaded');
}

// Make functions globally available
window.loadDashboard = loadDashboard;
window.updateDashboardStats = updateDashboardStats;
window.loadRecentActivity = loadRecentActivity;
window.updateSystemInfo = updateSystemInfo;
window.getCurrentDayRange = getCurrentDayRange;
window.getClientsDatabase = getClientsDatabase;
window.navigateToSection = navigateToSection;
window.refreshActivity = refreshActivity;
window.loadSales = loadSales;
window.loadClients = loadClients;
window.loadTreasury = loadTreasury;
window.loadDailyReport = loadDailyReport;
window.loadPurchases = loadPurchases;
window.loadBudget = loadBudget;
window.loadVehicles = loadVehicles;
window.loadBankManagement = loadBankManagement;