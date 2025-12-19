// Master Developer Panel Script
class DeveloperPanel {
    constructor() {
        this.isAuthenticated = false;
        this.developerKey = 'ahmedmohamed4112024';
        this.currentVersion = '1.0.0';
        this.initializePanel();
    }

    initializePanel() {
        this.checkServerStatus();
        this.loadDashboardStats();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Company form submission
        document.getElementById('companyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCompany();
        });

        // Enter key for authentication
        document.getElementById('devKeyInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.authenticateDev();
            }
        });
    }

    // Authentication
    authenticateDev() {
        const inputKey = document.getElementById('devKeyInput').value;
        
        if (inputKey === this.developerKey) {
            this.isAuthenticated = true;
            document.getElementById('mainContent').style.display = 'block';
            document.getElementById('devKeyInput').style.display = 'none';
            document.querySelector('.auth-btn').style.display = 'none';
            
            this.showToast('تم تسجيل الدخول بنجاح', 'success');
            this.loadAllData();
        } else {
            this.showToast('مفتاح المطور غير صحيح', 'error');
            document.getElementById('devKeyInput').value = '';
        }
    }

    // Dashboard Stats
    async loadDashboardStats() {
        try {
            if (!this.isAuthenticated) return;

            // Get total companies
            const { data: companies, error: companiesError } = await supabase
                .from('companies')
                .select('*');

            if (!companiesError) {
                document.getElementById('totalCompanies').textContent = companies.length;
            }

            // Get total transactions (sales + treasury)
            const { data: sales } = await supabase.from('sales').select('*');
            const { data: treasury } = await supabase.from('treasury').select('*');
            
            const totalTransactions = (sales?.length || 0) + (treasury?.length || 0);
            document.getElementById('totalTransactions').textContent = totalTransactions;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // Server Status Check
    async checkServerStatus() {
        try {
            const { data, error } = await supabase.from('companies').select('count');
            
            if (!error) {
                document.getElementById('serverStatus').textContent = 'Online';
                document.getElementById('serverStatus').style.color = '#22c55e';
            }
        } catch (error) {
            document.getElementById('serverStatus').textContent = 'Offline';
            document.getElementById('serverStatus').style.color = '#ef4444';
        }
    }

    // Add Company
    async addCompany() {
        if (!this.isAuthenticated) {
            this.showToast('يجب تسجيل الدخول أولاً', 'error');
            return;
        }

        const companyData = {
            name: document.getElementById('companyName').value,
            company_code: document.getElementById('companyCode').value,
            owner_name: document.getElementById('ownerName').value,
            license_expiry: document.getElementById('expiryDate').value
        };

        try {
            const { data, error } = await supabase
                .from('companies')
                .insert([companyData])
                .select();

            if (error) throw error;

            this.showToast('تم إضافة الشركة بنجاح', 'success');
            document.getElementById('companyForm').reset();
            this.loadCompanies();
            this.loadDashboardStats();

        } catch (error) {
            console.error('Error adding company:', error);
            this.showToast('فشل في إضافة الشركة: ' + error.message, 'error');
        }
    }

    // Load Companies
    async loadCompanies() {
        if (!this.isAuthenticated) return;

        try {
            const { data: companies, error } = await supabase
                .from('companies')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const companiesList = document.getElementById('companiesList');
            companiesList.innerHTML = '';

            companies.forEach(company => {
                const isExpired = new Date(company.license_expiry) < new Date();
                const statusClass = isExpired ? 'expired' : 'active';
                const statusText = isExpired ? 'منتهي الصلاحية' : 'نشط';

                const companyElement = document.createElement('div');
                companyElement.className = 'company-item';
                companyElement.innerHTML = `
                    <div class="company-info">
                        <h4>${company.name}</h4>
                        <p>كود: ${company.company_code} | المالك: ${company.owner_name || 'غير محدد'}</p>
                        <p>انتهاء الترخيص: ${new Date(company.license_expiry).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div class="company-status ${statusClass}">${statusText}</div>
                `;
                companiesList.appendChild(companyElement);
            });

        } catch (error) {
            console.error('Error loading companies:', error);
            this.showToast('فشل في تحميل الشركات', 'error');
        }
    }

    // Push Global Update
    async pushGlobalUpdate() {
        if (!this.isAuthenticated) {
            this.showToast('يجب تسجيل الدخول أولاً', 'error');
            return;
        }

        const newVersion = document.getElementById('newVersion').value;
        const newFeatures = document.getElementById('newFeatures').value.split('\n').filter(f => f.trim());
        const updatedFiles = document.getElementById('updatedFiles').value.split(',').map(f => f.trim()).filter(f => f);
        const mandatory = document.getElementById('mandatoryUpdate').checked;

        if (!newVersion) {
            this.showToast('يرجى إدخال رقم الإصدار الجديد', 'error');
            return;
        }

        try {
            // Create comprehensive version data
            const versionData = {
                version: newVersion,
                update_date: new Date().toISOString().split('T')[0],
                mandatory: mandatory,
                new_features: newFeatures.length ? newFeatures : ['تحسينات عامة'],
                files_to_update: updatedFiles.length ? updatedFiles : ['script.js'],
                signature: 'basira_verified_2025',
                update_url: 'https://your-server.com/basira-updates/',
                branding: {
                    logo_url: 'https://your-server.com/basira-logo.png',
                    company_name: 'Basira ERP'
                }
            };

            // Update local version.json (in production, this would update your server)
            localStorage.setItem('central_version', JSON.stringify(versionData));
            
            // Send real-time signal to all clients via Supabase
            if (window.supabase) {
                await window.supabase
                    .channel('global-updates')
                    .send({
                        type: 'broadcast',
                        event: 'force-update',
                        payload: { version: newVersion, mandatory }
                    });
            }
            
            // Update local version
            this.currentVersion = newVersion;
            document.getElementById('currentVersion').textContent = newVersion;
            
            // Clear form
            document.getElementById('newVersion').value = '';
            document.getElementById('newFeatures').value = '';
            document.getElementById('updatedFiles').value = '';
            document.getElementById('mandatoryUpdate').checked = false;

            this.showToast(`تم دفع التحديث ${newVersion} بنجاح لجميع العملاء`, 'success');

        } catch (error) {
            console.error('Error pushing update:', error);
            this.showToast('فشل في دفع التحديث: ' + error.message, 'error');
        }
    }
    
    // Test Update Modal
    testUpdate() {
        const newVersion = document.getElementById('newVersion').value || '2.0.2-test';
        
        // Create test version data
        const testVersionData = {
            version: newVersion,
            update_date: new Date().toISOString().split('T')[0],
            mandatory: false,
            new_features: ['اختبار التحديث', 'معاينة الواجهة'],
            files_to_update: ['script.js'],
            signature: 'basira_verified_2025',
            branding: {
                logo_url: 'https://your-server.com/basira-logo.png',
                company_name: 'Basira ERP'
            }
        };
        
        // Show test modal
        this.showUpdateModal(testVersionData);
        this.showToast('تم عرض نافذة التحديث التجريبية', 'info');
    }
    
    showUpdateModal(versionData) {
        if (document.getElementById('test-update-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'test-update-modal';
        modal.className = 'update-modal-overlay';
        modal.innerHTML = `
            <div class="update-modal">
                <div class="update-header">
                    <img src="${versionData.branding.logo_url}" alt="Basira" class="update-logo" onerror="this.style.display='none'">
                    <h2>تحديث جديد متاح</h2>
                    <div class="security-badge">
                        <i class="fas fa-shield-check"></i>
                        System Integrity Verified
                    </div>
                </div>
                
                <div class="update-content">
                    <div class="version-info">
                        <span class="version-badge">الإصدار ${versionData.version}</span>
                        <span class="update-date">${versionData.update_date}</span>
                    </div>
                    
                    <div class="update-message">
                        يتم الآن تحسين النظام لنسخة ${versionData.version}
                    </div>
                    
                    <div class="new-features">
                        <h4>الميزات الجديدة:</h4>
                        <ul>
                            ${versionData.new_features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="update-actions">
                    <button class="update-btn" onclick="devPanel.closeTestModal()">إغلاق الاختبار</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    closeTestModal() {
        const modal = document.getElementById('test-update-modal');
        if (modal) modal.remove();
    }

    // Database Browser
    async loadTableData() {
        if (!this.isAuthenticated) return;

        const selectedTable = document.getElementById('tableSelect').value;
        if (!selectedTable) return;

        try {
            const { data, error } = await supabase
                .from(selectedTable)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            this.renderTable(data, selectedTable);

        } catch (error) {
            console.error('Error loading table data:', error);
            this.showToast('فشل في تحميل البيانات', 'error');
        }
    }

    renderTable(data, tableName) {
        const tableHead = document.getElementById('tableHead');
        const tableBody = document.getElementById('tableBody');

        if (!data || data.length === 0) {
            tableHead.innerHTML = '';
            tableBody.innerHTML = '<tr><td colspan="100%">لا توجد بيانات</td></tr>';
            return;
        }

        // Create headers
        const headers = Object.keys(data[0]);
        tableHead.innerHTML = `
            <tr>
                ${headers.map(header => `<th>${this.translateHeader(header)}</th>`).join('')}
            </tr>
        `;

        // Create rows
        tableBody.innerHTML = data.map(row => `
            <tr>
                ${headers.map(header => `<td>${this.formatCellValue(row[header], header)}</td>`).join('')}
            </tr>
        `).join('');
    }

    translateHeader(header) {
        const translations = {
            'id': 'المعرف',
            'company_code': 'كود الشركة',
            'name': 'الاسم',
            'client_name': 'اسم العميل',
            'car_number': 'رقم السيارة',
            'material_type': 'نوع المادة',
            'volume': 'الحجم',
            'total_price': 'السعر الإجمالي',
            'transaction_type': 'نوع المعاملة',
            'amount': 'المبلغ',
            'description': 'الوصف',
            'created_at': 'تاريخ الإنشاء',
            'license_expiry': 'انتهاء الترخيص',
            'owner_name': 'اسم المالك'
        };
        return translations[header] || header;
    }

    formatCellValue(value, header) {
        if (value === null || value === undefined) return '-';
        
        if (header.includes('date') || header.includes('created_at')) {
            return new Date(value).toLocaleDateString('ar-EG');
        }
        
        if (header.includes('price') || header.includes('amount')) {
            return parseFloat(value).toFixed(2) + ' ج.م';
        }
        
        return value;
    }

    refreshData() {
        this.loadTableData();
        this.loadDashboardStats();
        this.loadCompanies();
        this.showToast('تم تحديث البيانات', 'success');
    }

    loadAllData() {
        this.loadDashboardStats();
        this.loadCompanies();
    }

    // Toast Notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `dev-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'rgba(34, 197, 94, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(138, 43, 226, 0.9)'};
            color: white;
            padding: 15px 20px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            font-family: 'Cairo', sans-serif;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize Developer Panel
const devPanel = new DeveloperPanel();

// Global Functions
function authenticateDev() {
    devPanel.authenticateDev();
}

function pushGlobalUpdate() {
    devPanel.pushGlobalUpdate();
}

function testUpdate() {
    devPanel.testUpdate();
}

function loadTableData() {
    devPanel.loadTableData();
}

function refreshData() {
    devPanel.refreshData();
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);