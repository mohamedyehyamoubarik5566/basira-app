// Staff Management System

// Sample Staff Data
let staffData = [
    { id: 1, name: 'أحمد محمد', position: 'محاسب', dailyRate: 150, avatar: 'أم' },
    { id: 2, name: 'فاطمة علي', position: 'سكرتيرة', dailyRate: 120, avatar: 'فع' },
    { id: 3, name: 'محمد حسن', position: 'مشغل ميزان', dailyRate: 100, avatar: 'مح' },
    { id: 4, name: 'عائشة أحمد', position: 'مراقب جودة', dailyRate: 130, avatar: 'عأ' },
    { id: 5, name: 'يوسف إبراهيم', position: 'سائق', dailyRate: 90, avatar: 'يإ' },
    { id: 6, name: 'زينب محمود', position: 'عاملة تنظيف', dailyRate: 80, avatar: 'زم' },
    { id: 7, name: 'خالد سعد', position: 'حارس أمن', dailyRate: 85, avatar: 'خس' },
    { id: 8, name: 'مريم عبدالله', position: 'مساعد إداري', dailyRate: 110, avatar: 'مع' }
];

// Current data
let currentDate = new Date().toISOString().split('T')[0];
let attendanceData = {};
let advancesData = [];
let safeBalance = 15750;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeStaffModule();
    loadAttendanceData();
    loadAdvancesData();
    updateClock();
    setInterval(updateClock, 1000);
    checkShiftReset();
    setInterval(checkShiftReset, 60000); // Check every minute
});

function initializeStaffModule() {
    populateAttendanceTable();
    populateStaffDropdowns();
    updateStats();
    updateCurrentDate();
}

// Clock and Shift Management
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentTime').textContent = timeString;
}

function checkShiftReset() {
    const now = new Date();
    const resetTime = new Date();
    resetTime.setHours(8, 0, 0, 0);
    
    // If it's 08:00 AM, reset attendance
    if (now.getHours() === 8 && now.getMinutes() === 0 && now.getSeconds() === 0) {
        resetDailyAttendance();
    }
}

function resetDailyAttendance() {
    currentDate = new Date().toISOString().split('T')[0];
    attendanceData = {};
    populateAttendanceTable();
    updateCurrentDate();
    showToast('تم إعادة تعيين الحضور للوردية الجديدة', 'info');
}

function updateCurrentDate() {
    const dateObj = new Date();
    const arabicDate = dateObj.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('currentDate').textContent = arabicDate;
}

// View Switching
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
        attendance: { title: 'تتبع الحضور', subtitle: 'إدارة حضور وغياب الموظفين' },
        advances: { title: 'إدارة السلف', subtitle: 'تسجيل ومتابعة السلف المالية' },
        payroll: { title: 'حساب الرواتب', subtitle: 'حساب الرواتب الشهرية للموظفين' },
        settlement: { title: 'تصفية الرواتب', subtitle: 'إجراء تصفية نهائية للرواتب' }
    };
    
    document.getElementById('pageTitle').textContent = titles[view].title;
    document.getElementById('pageSubtitle').textContent = titles[view].subtitle;
    
    // Load view-specific data
    if (view === 'payroll') {
        generatePayrollCards();
    }
}

// Attendance Management
function populateAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    
    staffData.forEach(staff => {
        const row = document.createElement('div');
        row.className = 'staff-row';
        row.innerHTML = `
            <div class="staff-info">
                <div class="staff-avatar">${staff.avatar}</div>
                <div class="staff-details">
                    <h4>${staff.name}</h4>
                    <p>ID: ${staff.id}</p>
                </div>
            </div>
            <div class="position-badge">${staff.position}</div>
            <div class="daily-rate">${staff.dailyRate} ج.م</div>
            <div class="attendance-status">
                <button class="status-btn ${attendanceData[staff.id] === 'present' ? 'present' : ''}" 
                        onclick="markAttendance(${staff.id}, 'present')">حاضر</button>
                <button class="status-btn ${attendanceData[staff.id] === 'absent' ? 'absent' : ''}" 
                        onclick="markAttendance(${staff.id}, 'absent')">غائب</button>
            </div>
            <div class="action-buttons">
                <button class="action-btn" onclick="viewStaffDetails(${staff.id})" title="عرض التفاصيل">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" onclick="editStaff(${staff.id})" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;
        tbody.appendChild(row);
    });
}

function markAttendance(staffId, status) {
    attendanceData[staffId] = status;
    populateAttendanceTable();
    updateStats();
    
    const staff = staffData.find(s => s.id === staffId);
    showToast(`تم تحديد ${staff.name} كـ ${status === 'present' ? 'حاضر' : 'غائب'}`, 'success');
}

function markAllPresent() {
    staffData.forEach(staff => {
        attendanceData[staff.id] = 'present';
    });
    populateAttendanceTable();
    updateStats();
    showToast('تم تحديد جميع الموظفين كحاضرين', 'success');
}

function saveAttendance() {
    const attendanceRecord = {
        date: currentDate,
        attendance: { ...attendanceData },
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`attendance_${currentDate}`, JSON.stringify(attendanceRecord));
    showToast('تم حفظ بيانات الحضور بنجاح', 'success');
}

function loadAttendanceData() {
    const saved = localStorage.getItem(`attendance_${currentDate}`);
    if (saved) {
        const data = JSON.parse(saved);
        attendanceData = data.attendance;
    }
}

// Advances Management
function populateStaffDropdowns() {
    const advanceSelect = document.getElementById('advanceStaff');
    const settlementSelect = document.getElementById('settlementStaff');
    
    [advanceSelect, settlementSelect].forEach(select => {
        select.innerHTML = '<option>اختر الموظف</option>';
        staffData.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.id;
            option.textContent = staff.name;
            select.appendChild(option);
        });
    });
}

function addAdvance() {
    const staffId = parseInt(document.getElementById('advanceStaff').value);
    const amount = parseFloat(document.getElementById('advanceAmount').value);
    const note = document.getElementById('advanceNote').value;
    
    if (!staffId || !amount || amount <= 0) {
        showToast('يرجى اختيار الموظف وإدخال مبلغ صحيح', 'error');
        return;
    }
    
    if (amount > safeBalance) {
        showToast('المبلغ أكبر من رصيد الخزينة المتاح', 'error');
        return;
    }
    
    const staff = staffData.find(s => s.id === staffId);
    const advance = {
        id: Date.now(),
        staffId: staffId,
        staffName: staff.name,
        amount: amount,
        note: note,
        date: new Date().toISOString(),
        dateString: new Date().toLocaleDateString('ar-EG')
    };
    
    advancesData.push(advance);
    safeBalance -= amount;
    
    // Clear form
    document.getElementById('advanceStaff').value = '';
    document.getElementById('advanceAmount').value = '';
    document.getElementById('advanceNote').value = '';
    
    updateAdvancesList();
    updateStats();
    saveAdvancesData();
    
    showToast(`تم إضافة سلفة ${amount} ج.م لـ ${staff.name}`, 'success');
}

function updateAdvancesList() {
    const list = document.getElementById('advancesList');
    list.innerHTML = '';
    
    const sortedAdvances = [...advancesData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedAdvances.forEach(advance => {
        const item = document.createElement('div');
        item.className = 'advance-item';
        item.innerHTML = `
            <div class="advance-info">
                <div class="advance-staff">${advance.staffName}</div>
                <div class="advance-date">${advance.dateString}</div>
                ${advance.note ? `<div class="advance-note">${advance.note}</div>` : ''}
            </div>
            <div class="advance-amount">${advance.amount} ج.م</div>
        `;
        list.appendChild(item);
    });
}

function loadAdvancesData() {
    const saved = localStorage.getItem('staffAdvances');
    if (saved) {
        advancesData = JSON.parse(saved);
        updateAdvancesList();
    }
}

function saveAdvancesData() {
    localStorage.setItem('staffAdvances', JSON.stringify(advancesData));
}

// Payroll Management
function generatePayrollCards() {
    const grid = document.getElementById('payrollGrid');
    grid.innerHTML = '';
    
    staffData.forEach(staff => {
        const workingDays = calculateWorkingDays(staff.id);
        const totalAdvances = calculateTotalAdvances(staff.id);
        const grossSalary = workingDays * staff.dailyRate;
        const netSalary = grossSalary - totalAdvances;
        
        const card = document.createElement('div');
        card.className = 'payroll-card';
        card.innerHTML = `
            <div class="payroll-header">
                <div class="payroll-avatar">${staff.avatar}</div>
                <div class="payroll-info">
                    <h3>${staff.name}</h3>
                    <p>${staff.position}</p>
                </div>
            </div>
            <div class="payroll-calculations">
                <div class="calc-row">
                    <span class="calc-label">أيام العمل:</span>
                    <span class="calc-value">${workingDays} يوم</span>
                </div>
                <div class="calc-row">
                    <span class="calc-label">الراتب اليومي:</span>
                    <span class="calc-value">${staff.dailyRate} ج.م</span>
                </div>
                <div class="calc-row">
                    <span class="calc-label">إجمالي الراتب:</span>
                    <span class="calc-value positive">${grossSalary} ج.م</span>
                </div>
                <div class="calc-row">
                    <span class="calc-label">إجمالي السلف:</span>
                    <span class="calc-value negative">-${totalAdvances} ج.م</span>
                </div>
                <div class="calc-row total">
                    <span class="calc-label">صافي الراتب:</span>
                    <span class="calc-value">${netSalary} ج.م</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function calculateWorkingDays(staffId) {
    // Calculate working days for current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day).toISOString().split('T')[0];
        const attendanceRecord = localStorage.getItem(`attendance_${date}`);
        
        if (attendanceRecord) {
            const data = JSON.parse(attendanceRecord);
            if (data.attendance[staffId] === 'present') {
                workingDays++;
            }
        }
    }
    
    return workingDays;
}

function calculateTotalAdvances(staffId) {
    return advancesData
        .filter(advance => advance.staffId === staffId)
        .reduce((total, advance) => total + advance.amount, 0);
}

// Settlement Management
function calculateSettlement() {
    const staffId = parseInt(document.getElementById('settlementStaff').value);
    if (!staffId) {
        document.getElementById('settlementSummary').style.display = 'none';
        document.getElementById('settlementBtn').disabled = true;
        return;
    }
    
    const staff = staffData.find(s => s.id === staffId);
    const workingDays = calculateWorkingDays(staffId);
    const totalAdvances = calculateTotalAdvances(staffId);
    const grossSalary = workingDays * staff.dailyRate;
    const netSalary = grossSalary - totalAdvances;
    
    document.getElementById('totalDays').textContent = workingDays;
    document.getElementById('dailyRate').textContent = staff.dailyRate + ' ج.م';
    document.getElementById('totalSalary').textContent = grossSalary + ' ج.م';
    document.getElementById('totalAdvances').textContent = totalAdvances + ' ج.م';
    document.getElementById('netSalary').textContent = netSalary + ' ج.م';
    
    document.getElementById('settlementSummary').style.display = 'block';
    document.getElementById('settlementBtn').disabled = netSalary <= 0;
    
    generateReceiptPreview(staff, workingDays, grossSalary, totalAdvances, netSalary);
}

function generateReceiptPreview(staff, workingDays, grossSalary, totalAdvances, netSalary) {
    const preview = document.getElementById('receiptPreview');
    const now = new Date();
    
    preview.innerHTML = `
        <div class="receipt-header-content">
            <div class="receipt-title">إيصال تصفية راتب</div>
            <div class="receipt-subtitle">شركة البصيرة للتجارة</div>
        </div>
        
        <div class="receipt-details">
            <div class="receipt-section">
                <h4>بيانات الموظف</h4>
                <div class="receipt-row">
                    <span>الاسم:</span>
                    <span>${staff.name}</span>
                </div>
                <div class="receipt-row">
                    <span>المنصب:</span>
                    <span>${staff.position}</span>
                </div>
                <div class="receipt-row">
                    <span>رقم الموظف:</span>
                    <span>${staff.id}</span>
                </div>
            </div>
            
            <div class="receipt-section">
                <h4>بيانات التصفية</h4>
                <div class="receipt-row">
                    <span>التاريخ:</span>
                    <span>${now.toLocaleDateString('ar-EG')}</span>
                </div>
                <div class="receipt-row">
                    <span>الوقت:</span>
                    <span>${now.toLocaleTimeString('ar-EG')}</span>
                </div>
                <div class="receipt-row">
                    <span>رقم الإيصال:</span>
                    <span>REC-${Date.now()}</span>
                </div>
            </div>
        </div>
        
        <div class="receipt-section">
            <h4>تفاصيل الراتب</h4>
            <div class="receipt-row">
                <span>أيام العمل:</span>
                <span>${workingDays} يوم</span>
            </div>
            <div class="receipt-row">
                <span>الراتب اليومي:</span>
                <span>${staff.dailyRate} ج.م</span>
            </div>
            <div class="receipt-row">
                <span>إجمالي الراتب:</span>
                <span>${grossSalary} ج.م</span>
            </div>
            <div class="receipt-row">
                <span>إجمالي السلف:</span>
                <span>-${totalAdvances} ج.م</span>
            </div>
        </div>
        
        <div class="receipt-total">
            <div>صافي المبلغ المستحق</div>
            <div class="receipt-total-amount">${netSalary} ج.م</div>
        </div>
    `;
    
    document.getElementById('printBtn').style.display = 'block';
}

function processSettlement() {
    const staffId = parseInt(document.getElementById('settlementStaff').value);
    const staff = staffData.find(s => s.id === staffId);
    const netSalary = parseFloat(document.getElementById('netSalary').textContent.replace(' ج.م', ''));
    
    if (netSalary > safeBalance) {
        showToast('رصيد الخزينة غير كافي لإجراء التصفية', 'error');
        return;
    }
    
    // Deduct from safe
    safeBalance -= netSalary;
    
    // Clear staff advances
    advancesData = advancesData.filter(advance => advance.staffId !== staffId);
    
    // Save settlement record
    const settlement = {
        staffId: staffId,
        staffName: staff.name,
        amount: netSalary,
        date: new Date().toISOString(),
        receiptNumber: `REC-${Date.now()}`
    };
    
    let settlements = JSON.parse(localStorage.getItem('settlements') || '[]');
    settlements.push(settlement);
    localStorage.setItem('settlements', JSON.stringify(settlements));
    
    updateStats();
    saveAdvancesData();
    
    showToast(`تم إجراء تصفية راتب ${staff.name} بمبلغ ${netSalary} ج.م`, 'success');
    
    // Show receipt modal
    showReceiptModal();
}

function showReceiptModal() {
    document.getElementById('receiptModal').classList.add('active');
    document.getElementById('receiptBody').innerHTML = document.getElementById('receiptPreview').innerHTML;
}

function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('active');
}

function printReceipt() {
    window.print();
}

// Statistics Update
function updateStats() {
    const presentCount = Object.values(attendanceData).filter(status => status === 'present').length;
    
    document.getElementById('totalStaff').textContent = staffData.length;
    document.getElementById('presentToday').textContent = presentCount;
    document.getElementById('safeBalance').textContent = safeBalance.toLocaleString();
}

// Utility Functions
function viewStaffDetails(staffId) {
    const staff = staffData.find(s => s.id === staffId);
    const workingDays = calculateWorkingDays(staffId);
    const totalAdvances = calculateTotalAdvances(staffId);
    
    showToast(`${staff.name} - أيام العمل: ${workingDays} - السلف: ${totalAdvances} ج.م`, 'info');
}

function editStaff(staffId) {
    showToast('ميزة تعديل بيانات الموظف قيد التطوير', 'info');
}

// Theme Toggle (inherited from control panel)
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    
    const themeBtn = document.querySelector('.theme-toggle');
    const icon = themeBtn.querySelector('i');
    const text = themeBtn.querySelector('span');
    
    if (document.body.classList.contains('light-mode')) {
        icon.className = 'fas fa-sun';
        text.textContent = 'الوضع المضيء';
    } else {
        icon.className = 'fas fa-moon';
        text.textContent = 'الوضع المظلم';
    }
}

// Sidebar Toggle (inherited from control panel)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}