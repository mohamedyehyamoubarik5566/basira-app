// Simple Database Manager - localStorage Only
class SimpleDatabaseManager {
    constructor() {
        this.isOnline = false; // Always offline mode
        console.log('Database Manager initialized in localStorage-only mode');
    }

    // Save Sales Data
    async saveSale(saleData) {
        try {
            const data = {
                ...saleData,
                id: saleData.id || Date.now(),
                created_at: new Date().toISOString()
            };

            // Save to localStorage
            const sales = JSON.parse(localStorage.getItem('permissions') || '[]');
            sales.push(data);
            localStorage.setItem('permissions', JSON.stringify(sales));
            
            return data;
        } catch (error) {
            console.error('Error saving sale:', error);
            throw error;
        }
    }

    // Get Sales Data
    async getSales(filters = {}) {
        try {
            const sales = JSON.parse(localStorage.getItem('permissions') || '[]');
            return sales;
        } catch (error) {
            console.error('Error getting sales:', error);
            return [];
        }
    }

    // Disabled functions for compatibility
    subscribeSalesUpdates() { return null; }
    subscribeStaffUpdates() { return null; }
}

// Initialize Database Manager
const dbManager = new SimpleDatabaseManager();

// Make globally available
window.dbManager = dbManager;
window.isSupabaseAvailable = false;