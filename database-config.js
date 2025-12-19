// Database Configuration - Local Storage Only
let dbClient = null;
let isSupabaseAvailable = false;

// Skip Supabase initialization - use localStorage only
console.log('Using localStorage-only mode');
isSupabaseAvailable = false;

// Database Manager
class DatabaseManager {
    constructor() {
        this.companyCode = this.getCompanyCode();
        this.isOnline = navigator.onLine;
        this.initializeConnectionMonitor();
        this.showSystemStatus();
    }
    
    // Show system status on initialization
    showSystemStatus() {
        setTimeout(() => {
            if (!isSupabaseAvailable) {
                this.showToast('النظام يعمل في الوضع المحلي - جميع البيانات محفوظة محلياً', 'info');
            } else {
                this.showToast('النظام متصل بقاعدة البيانات السحابية', 'success');
            }
        }, 1000);
    }

    // Get current company code
    getCompanyCode() {
        const session = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return session.companyCode || 'DEMO';
    }

    // Monitor connection status
    initializeConnectionMonitor() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showToast('تم الاتصال بالإنترنت', 'success');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('لا يوجد اتصال بالإنترنت - سيتم الحفظ محلياً', 'warning');
        });
    }

    // Save Sales Data
    async saveSale(saleData) {
        try {
            const data = {
                ...saleData,
                company_code: this.companyCode,
                created_at: new Date().toISOString()
            };

            if (false) { // Always use localStorage
                const { data: result, error } = await supabase
                    .from('sales')
                    .insert([data])
                    .select();

                if (error) throw error;

                this.showToast('تم حفظ البيانات بنجاح', 'success');
                return result[0];
            } else {
                // Save to localStorage for offline sync
                this.saveOffline('sales', data);
                this.showToast('تم الحفظ محلياً', 'info');
                return data;
            }
        } catch (error) {
            console.error('Error saving sale:', error);
            // Fallback to localStorage
            this.saveOffline('sales', saleData);
            this.showToast('تم الحفظ محلياً بسبب خطأ في الاتصال', 'warning');
            return saleData;
        }
    }

    // Get Sales Data
    async getSales(filters = {}) {
        try {
            if (true) { // Always use localStorage
                return this.getOfflineData('sales');
            }

            let query = supabase
                .from('sales')
                .select('*')
                .eq('company_code', this.companyCode)
                .order('created_at', { ascending: false });

            // Apply filters
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }
            if (filters.clientName) {
                query = query.eq('client_name', filters.clientName);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching sales:', error);
            return this.getOfflineData('sales');
        }
    }

    // Save Staff Data
    async saveStaff(staffData) {
        try {
            const data = {
                ...staffData,
                company_code: this.companyCode,
                created_at: new Date().toISOString()
            };

            if (this.isOnline) {
                const { data: result, error } = await supabase
                    .from('staff')
                    .insert([data])
                    .select();

                if (error) throw error;

                this.showToast('تم حفظ بيانات الموظف بنجاح', 'success');
                return result[0];
            } else {
                this.saveOffline('staff', data);
                this.showToast('تم الحفظ محلياً', 'info');
                return data;
            }
        } catch (error) {
            console.error('Error saving staff:', error);
            this.showToast('فشل في حفظ البيانات', 'error');
            this.saveOffline('staff', staffData);
            throw error;
        }
    }

    // Get Staff Data
    async getStaff() {
        try {
            if (!this.isOnline) {
                return this.getOfflineData('staff');
            }

            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('company_code', this.companyCode)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching staff:', error);
            return this.getOfflineData('staff');
        }
    }

    // Biometric Authentication
    async authenticateBiometric(userId) {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Biometric auth error:', error);
            this.showToast('فشل في المصادقة البيومترية', 'error');
            throw error;
        }
    }

    // Verify User Role
    async verifyUserRole(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('role, company_code')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error verifying role:', error);
            return null;
        }
    }

    // Real-time Subscription for Sales
    subscribeSalesUpdates(callback) {
        // Real-time updates disabled in localStorage mode
        console.warn('Real-time updates disabled in localStorage mode');
        return null;
        
        try {
            const subscription = supabase
                .channel('sales_changes')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'sales',
                        filter: `company_code=eq.${this.companyCode}`
                    }, 
                    (payload) => {
                        console.log('Sales update:', payload);
                        callback(payload);
                        
                        if (payload.eventType === 'INSERT') {
                            this.showToast('تم إضافة مبيعة جديدة', 'info');
                        }
                    }
                )
                .subscribe();

            return subscription;
        } catch (error) {
            console.error('Error setting up real-time subscription:', error);
            return null;
        }
    }

    // Real-time Subscription for Staff
    subscribeStaffUpdates(callback) {
        const subscription = supabase
            .channel('staff_changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'staff',
                    filter: `company_code=eq.${this.companyCode}`
                }, 
                (payload) => {
                    console.log('Staff update:', payload);
                    callback(payload);
                }
            )
            .subscribe();

        return subscription;
    }

    // Offline Data Management
    saveOffline(table, data) {
        try {
            // Save to both offlineData and main storage
            const offlineData = JSON.parse(localStorage.getItem('offlineData') || '{}');
            if (!offlineData[table]) offlineData[table] = [];
            offlineData[table].push({ ...data, _offline: true, _timestamp: Date.now() });
            localStorage.setItem('offlineData', JSON.stringify(offlineData));
            
            // Also save to main storage for immediate access
            const mainData = JSON.parse(localStorage.getItem(table) || '[]');
            mainData.push({ ...data, id: data.id || Date.now() });
            localStorage.setItem(table, JSON.stringify(mainData));
            
        } catch (error) {
            console.error('Error saving offline data:', error);
        }
    }

    getOfflineData(table) {
        try {
            // Try to get from main storage first, then fallback to offlineData
            const mainData = JSON.parse(localStorage.getItem(table) || '[]');
            if (mainData.length > 0) {
                return mainData;
            }
            
            const offlineData = JSON.parse(localStorage.getItem('offlineData') || '{}');
            return offlineData[table] || [];
        } catch (error) {
            console.error('Error getting offline data:', error);
            return [];
        }
    }

    // Sync offline data when connection restored
    async syncOfflineData() {
        if (!isSupabaseAvailable || !supabase) {
            console.warn('Supabase not available, cannot sync offline data');
            return;
        }
        
        const offlineData = JSON.parse(localStorage.getItem('offlineData') || '{}');
        
        for (const [table, records] of Object.entries(offlineData)) {
            for (const record of records) {
                try {
                    delete record._offline;
                    delete record._timestamp;
                    
                    const { error } = await supabase
                        .from(table)
                        .insert([record]);

                    if (error) throw error;
                } catch (error) {
                    console.error(`Error syncing ${table}:`, error);
                }
            }
        }

        localStorage.removeItem('offlineData');
        this.showToast('تم مزامنة البيانات بنجاح', 'success');
    }

    // Toast Notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `db-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'rgba(34, 197, 94, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : type === 'warning' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(59, 130, 246, 0.9)'};
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

// Initialize Database Manager
const dbManager = new DatabaseManager();

// Make globally available
window.dbManager = dbManager;
window.isSupabaseAvailable = false;

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