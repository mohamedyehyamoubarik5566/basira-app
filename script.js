// Basira App - Main JavaScript

// Wait for SystemConfig to load
if (typeof SystemConfig === 'undefined') {
    console.warn('SystemConfig not loaded yet, waiting...');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Wait for SystemConfig if not loaded
    if (typeof SystemConfig === 'undefined') {
        let configCheckInterval = setInterval(() => {
            if (typeof SystemConfig !== 'undefined') {
                clearInterval(configCheckInterval);
                console.log('SystemConfig loaded successfully');
                initializeApp();
            }
        }, 100);
    } else {
        initializeApp();
    }
});

// Initialize application
function initializeApp() {
    updateCurrentDate();
    setupNavigation();
    setupSidebar();
    loadSalesData();
    setupModalHandlers();
    updateDashboardStats();
    
    // Update date every minute
    setInterval(updateCurrentDate, 60000);
}

// Enhanced date display with error handling
function updateCurrentDate() {
    try {
        const dateElement = document.getElementById('currentDate');
        if (!dateElement) return;
        
        const formattedDate = DateUtils.formatDateTime(new Date());
        dateElement.textContent = formattedDate;
        
        // Add business hours indicator
        const isBusinessHours = DateUtils.isBusinessHours();
        dateElement.className = isBusinessHours ? 'business-hours' : 'after-hours';
        
    } catch (error) {
        console.error('Error updating date:', error);
    }
}

// Setup navigation between sections
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get section to show
            const section = this.getAttribute('data-section');
            
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(sec => {
                sec.classList.remove('active');
            });
            
            // Show selected section
            document.getElementById(section + '-section').classList.add('active');
            
            // Update page title
            const titles = {
                'dashboard': 'لوحة التحكم',
                'sales': 'المبيعات',
                'clients': 'العملاء',
                'settings': 'الإعدادات'
            };
            document.getElementById('pageTitle').textContent = titles[section];
            
            // Load data if sales section
            if (section === 'sales') {
                loadSalesData();
            }
        });
    });
}

// Setup sidebar toggle for mobile
function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('show');
    });
}

// Get current business day range (8 AM today to 8 AM tomorrow)
function getCurrentBusinessDayRange() {
    const now = new Date();
    const currentHour = now.getHours();
    
    let startDate = new Date(now);
    let endDate = new Date(now);
    
    // If current time is before 8 AM, business day started yesterday at 8 AM
    if (currentHour < 8) {
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(8, 0, 0, 0);
        endDate.setHours(8, 0, 0, 0);
    } else {
        // Business day started today at 8 AM
        startDate.setHours(8, 0, 0, 0);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(8, 0, 0, 0);
    }
    
    return { startDate, endDate };
}

// Load sales data from localStorage
function loadSalesData() {
    const { startDate, endDate } = getCurrentBusinessDayRange();
    const allSales = getSalesFromStorage();
    
    // Filter sales for current business day
    const todaySales = allSales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= startDate && saleDate < endDate;
    });
    
    displaySalesTable(todaySales);
    updateDashboardStats();
}

// Enhanced data management with error handling
function getSalesFromStorage() {
    try {
        return db.getItem('sales', []);
    } catch (error) {
        console.error('Error loading sales data:', error);
        notify.show('خطأ في تحميل بيانات المبيعات', 'error');
        return [];
    }
}

function saveSalesToStorage(sales) {
    try {
        if (!Array.isArray(sales)) {
            throw new Error('Sales data must be an array');
        }
        
        // Validate data before saving
        const validSales = sales.filter(sale => {
            return sale && sale.id && sale.clientName && sale.tripTotal;
        });
        
        if (validSales.length !== sales.length) {
            console.warn('Some invalid sales records were filtered out');
        }
        
        return db.setItem('sales', validSales);
    } catch (error) {
        console.error('Error saving sales data:', error);
        notify.show('خطأ في حفظ بيانات المبيعات', 'error');
        return false;
    }
}

// Display sales in table
function displaySalesTable(sales) {
    const tbody = document.getElementById('salesTableBody');
    
    if (sales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">لا توجد مبيعات لهذا اليوم</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sales.map((sale, index) => {
        const time = new Date(sale.timestamp).toLocaleTimeString('ar-EG', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${sale.clientName}</td>
                <td>${parseFloat(sale.pricePerMeter).toFixed(2)} جنيه</td>
                <td>${parseFloat(sale.totalMeters).toFixed(2)} متر</td>
                <td class="fw-bold text-primary">${parseFloat(sale.tripTotal).toFixed(2)} جنيه</td>
                <td>${time}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteSale(${sale.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Setup modal handlers
function setupModalHandlers() {
    const addSaleBtn = document.getElementById('addSaleBtn');
    const saveSaleBtn = document.getElementById('saveSaleBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const pricePerMeter = document.getElementById('pricePerMeter');
    const totalMetersInput = document.getElementById('totalMetersInput');
    const tripTotal = document.getElementById('tripTotal');
    
    // Open modal
    addSaleBtn.addEventListener('click', function() {
        const modal = new bootstrap.Modal(document.getElementById('addSaleModal'));
        document.getElementById('addSaleForm').reset();
        tripTotal.value = '';
        modal.show();
    });
    
    // Calculate trip total on input change
    function calculateTripTotal() {
        const price = parseFloat(pricePerMeter.value) || 0;
        const meters = parseFloat(totalMetersInput.value) || 0;
        const total = price * meters;
        tripTotal.value = total.toFixed(2) + ' جنيه';
    }
    
    pricePerMeter.addEventListener('input', calculateTripTotal);
    totalMetersInput.addEventListener('input', calculateTripTotal);
    
    // Save sale
    saveSaleBtn.addEventListener('click', function() {
        const clientName = document.getElementById('clientName').value.trim();
        const price = parseFloat(pricePerMeter.value);
        const meters = parseFloat(totalMetersInput.value);
        
        if (!clientName || !price || !meters) {
            alert('الرجاء ملء جميع الحقول');
            return;
        }
        
        const sale = {
            id: Date.now(),
            clientName: clientName,
            pricePerMeter: price,
            totalMeters: meters,
            tripTotal: price * meters,
            timestamp: new Date().toISOString()
        };
        
        const allSales = getSalesFromStorage();
        allSales.push(sale);
        saveSalesToStorage(allSales);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addSaleModal'));
        modal.hide();
        
        // Reload data
        loadSalesData();
        
        // Show success message
        showNotification('تم إضافة المبيعة بنجاح', 'success');
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', function() {
        loadSalesData();
        showNotification('تم تحديث البيانات', 'success');
    });
}

// Delete sale
function deleteSale(id) {
    if (!confirm('هل أنت متأكد من حذف هذه المبيعة؟')) {
        return;
    }
    
    let allSales = getSalesFromStorage();
    allSales = allSales.filter(sale => sale.id !== id);
    saveSalesToStorage(allSales);
    
    loadSalesData();
    showNotification('تم حذف المبيعة بنجاح', 'success');
}

// Update dashboard statistics
function updateDashboardStats() {
    const { startDate, endDate } = getCurrentBusinessDayRange();
    const allSales = getSalesFromStorage();
    
    // Filter sales for current business day
    const todaySales = allSales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= startDate && saleDate < endDate;
    });
    
    // Calculate stats
    const totalSales = todaySales.reduce((sum, sale) => sum + sale.tripTotal, 0);
    const totalMeters = todaySales.reduce((sum, sale) => sum + sale.totalMeters, 0);
    const uniqueClients = new Set(todaySales.map(sale => sale.clientName)).size;
    const totalTrips = todaySales.length;
    
    // Update UI
    document.getElementById('todaySales').textContent = totalSales.toFixed(2) + ' جنيه';
    document.getElementById('totalMeters').textContent = totalMeters.toFixed(2) + ' متر';
    document.getElementById('totalClients').textContent = uniqueClients;
    document.getElementById('totalTrips').textContent = totalTrips;
}

// Use the enhanced notification system
function showNotification(message, type = 'success') {
    notify.show(message, type);
}

// Make deleteSale available globally
window.deleteSale = deleteSale;

// Print Statement Function
function printStatement() {
    if (!currentStatementClient) {
        showNotification('لم يتم تحديد عميل للطباعة', 'error');
        return;
    }
    
    const client = getClientsDatabase()[currentStatementClient];
    if (!client) {
        showNotification('بيانات العميل غير موجودة', 'error');
        return;
    }
    
    try {
        // جلب جميع الأذون للعميل
        const allPermissions = JSON.parse(localStorage.getItem('permissions') || '[]')
            .filter(p => p.clientName === currentStatementClient);
        const allPayments = getClientTransactions(currentStatementClient)
            .filter(t => t.type === 'payment');
        
        const openingBalance = parseFloat(client.openingBalance || 0);
        const totalSales = allPermissions.reduce((sum, p) => sum + parseFloat(p.totalPrice), 0);
        const totalPayments = allPayments.reduce((sum, p) => sum + p.amount, 0);
        const currentBalance = openingBalance + totalSales - totalPayments;
        
        // إنشاء محتوى الطباعة
        const printContent = `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>كشف حساب ${currentStatementClient}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { 
                        font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        color: #333; 
                        line-height: 1.6;
                        direction: rtl;
                    }
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-start;
                        border-bottom: 3px solid #333; 
                        padding-bottom: 20px; 
                        margin-bottom: 30px; 
                    }
                    .company-info h1 { 
                        color: #333; 
                        font-size: 28px; 
                        margin: 0 0 10px 0; 
                        font-weight: bold;
                    }
                    .company-info p { 
                        color: #666; 
                        margin: 5px 0; 
                        font-size: 14px;
                    }
                    .statement-info { 
                        text-align: left; 
                    }
                    .statement-info h2 { 
                        color: #333; 
                        font-size: 24px; 
                        margin: 0 0 15px 0; 
                        font-weight: bold;
                    }
                    .statement-info p {
                        margin: 5px 0;
                        font-size: 14px;
                    }
                    .balance-summary { 
                        background: #f8f9fa; 
                        border: 2px solid #dee2e6; 
                        border-radius: 8px; 
                        padding: 20px; 
                        margin-bottom: 30px; 
                    }
                    .balance-row { 
                        display: flex; 
                        justify-content: space-between; 
                        padding: 8px 0; 
                        border-bottom: 1px solid #dee2e6; 
                        font-size: 16px;
                    }
                    .balance-row:last-child { 
                        border-bottom: none; 
                    }
                    .balance-row.final { 
                        border-top: 2px solid #333; 
                        margin-top: 15px; 
                        padding-top: 15px; 
                        font-weight: bold; 
                        font-size: 18px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 20px; 
                        font-size: 14px;
                    }
                    th, td { 
                        border: 1px solid #333; 
                        padding: 10px 8px; 
                        text-align: center; 
                    }
                    th { 
                        background: #f5f5f5; 
                        font-weight: bold; 
                        font-size: 15px;
                    }
                    .payment-row { 
                        background: #fff3cd; 
                    }
                    .sale-row { 
                        background: #d1ecf1; 
                    }
                    .footer { 
                        margin-top: 40px; 
                        padding-top: 20px; 
                        border-top: 1px solid #dee2e6; 
                        text-align: center; 
                        color: #666; 
                        font-size: 14px; 
                    }
                    @media print { 
                        body { 
                            margin: 0; 
                            padding: 15px;
                        } 
                        .header {
                            page-break-inside: avoid;
                        }
                        table {
                            page-break-inside: auto;
                        }
                        tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-info">
                        <h1>شركة البصيرة للمقاولات</h1>
                        <p>متخصصون في توريد مواد البناء</p>
                        <p>📞 هاتف: 01234567890</p>
                        <p>📱 واتس: 01234567890</p>
                        <p>👨💼 محاسب: أحمد محمد - 01111111111</p>
                    </div>
                    <div class="statement-info">
                        <h2>كشف حساب عميل</h2>
                        <p><strong>اسم العميل:</strong> ${currentStatementClient}</p>
                        <p><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('ar-EG')}</p>
                        <p><strong>وقت الطباعة:</strong> ${new Date().toLocaleTimeString('ar-EG')}</p>
                    </div>
                </div>
                
                <div class="balance-summary">
                    <div class="balance-row">
                        <span>رصيد بداية الفترة:</span>
                        <span>${openingBalance.toFixed(2)} ج.م</span>
                    </div>
                    <div class="balance-row">
                        <span>إجمالي المبيعات:</span>
                        <span>${totalSales.toFixed(2)} ج.م</span>
                    </div>
                    <div class="balance-row">
                        <span>إجمالي المدفوعات:</span>
                        <span>${totalPayments.toFixed(2)} ج.م</span>
                    </div>
                    <div class="balance-row final">
                        <span>الرصيد النهائي:</span>
                        <span>${currentBalance.toFixed(2)} ج.م</span>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>م</th>
                            <th>التاريخ</th>
                            <th>النوع</th>
                            <th>الوصف</th>
                            <th>المبلغ</th>
                            <th>الرصيد الجاري</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${statementData.length === 0 ? '<tr><td colspan="6">لا توجد معاملات للفترة المحددة</td></tr>' : 
                            statementData.map((item, index) => {
                                const date = new Date(item.date).toLocaleDateString('ar-EG');
                                const rowClass = item.type === 'payment' ? 'payment-row' : 'sale-row';
                                
                                return `
                                    <tr class="${rowClass}">
                                        <td>${index + 1}</td>
                                        <td>${date}</td>
                                        <td>${item.type === 'sale' ? 'مبيعة' : 'دفعة'}</td>
                                        <td>${item.description || (item.type === 'sale' ? 'مبيعة' : 'دفعة')}</td>
                                        <td>${item.type === 'sale' ? '+' : '-'}${item.amount.toFixed(2)} ج.م</td>
                                        <td>${item.runningBalance.toFixed(2)} ج.م</td>
                                    </tr>
                                `;
                            }).join('')
                        }
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>تم إعداد هذا الكشف بواسطة نظام إدارة المبيعات - شركة البصيرة للتقنية</p>
                    <p>للمراجعة والاستفسار يرجى التواصل مع قسم المحاسبة</p>
                </div>
            </body>
            </html>
        `;
        
        // فتح نافذة طباعة جديدة
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            // إذا فشل فتح النافذة، جرب الطباعة المباشرة
            const printFrame = document.createElement('iframe');
            printFrame.style.display = 'none';
            document.body.appendChild(printFrame);
            
            const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;
            frameDoc.write(printContent);
            frameDoc.close();
            
            setTimeout(() => {
                printFrame.contentWindow.print();
                document.body.removeChild(printFrame);
            }, 500);
            
            showNotification('تم إرسال كشف الحساب للطباعة', 'success');
            return;
        }
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // انتظار تحميل المحتوى ثم الطباعة
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                
                // إغلاق النافذة بعد الطباعة
                setTimeout(() => {
                    printWindow.close();
                }, 1000);
            }, 500);
        };
        
        showNotification('تم إرسال كشف الحساب للطباعة', 'success');
        
    } catch (error) {
        console.error('Error printing statement:', error);
        showNotification('حدث خطأ أثناء الطباعة: ' + error.message, 'error');
        
        // محاولة بديلة للطباعة
        try {
            window.print();
        } catch (fallbackError) {
            console.error('Fallback print also failed:', fallbackError);
            showNotification('فشل في الطباعة. يرجى المحاولة مرة أخرى.', 'error');
        }
    }
}

// Make printStatement available globally
window.printStatement = printStatement;
// Global variables for client statement
let currentStatementClient = '';
let statementData = [];

// Helper functions for client statement
function getClientsDatabase() {
    // Get current user session
    let user = null;
    try {
        const sessionData = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        user = sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
        console.warn('Error parsing user session:', error);
    }
    
    // Get company code with fallback
    let companyCode = 'default';
    if (user?.companyCode) {
        companyCode = user.companyCode;
    } else if (user?.role === 'admin' || user?.username === 'developer') {
        companyCode = 'DEV';
    }
    
    // Load clients database for the company
    const dbKey = `clientsDatabase_${companyCode}`;
    let clientsDb = {};
    
    try {
        clientsDb = JSON.parse(localStorage.getItem(dbKey) || '{}');
    } catch (error) {
        console.warn('Error loading clients database:', error);
        clientsDb = {};
    }
    
    return clientsDb;
}

function getClientTransactions(clientName) {
    // Get current user session
    let user = null;
    try {
        const sessionData = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        user = sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
        console.warn('Error parsing user session:', error);
    }
    
    // Get company code with fallback
    let companyCode = 'default';
    if (user?.companyCode) {
        companyCode = user.companyCode;
    } else if (user?.role === 'admin' || user?.username === 'developer') {
        companyCode = 'DEV';
    }
    
    // Load client transactions
    const transactionsKey = `clientTransactions_${companyCode}`;
    let allTransactions = {};
    
    try {
        allTransactions = JSON.parse(localStorage.getItem(transactionsKey) || '{}');
    } catch (error) {
        console.warn('Error loading client transactions:', error);
        allTransactions = {};
    }
    
    return allTransactions[clientName] || [];
}

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

// Make functions available globally
window.getClientsDatabase = getClientsDatabase;
window.getClientTransactions = getClientTransactions;
window.showNotification = showNotification;