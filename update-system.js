// Central Update System
class UpdateManager {
    constructor() {
        this.currentVersion = localStorage.getItem('appVersion') || '2.0.0';
        this.updateServerUrl = null; // Disabled - using local mode
        this.companyBranding = JSON.parse(localStorage.getItem('companyBranding') || '{}');
        this.developerKey = 'ahmedmohamed4112024';
    }

    // Initialize update check on app start
    async initializeUpdateCheck() {
        try {
            await this.checkForUpdates();
        } catch (error) {
            console.warn('Update check failed:', error);
        }
    }

    // Check for available updates
    async checkForUpdates() {
        // Using local version - no remote server
        console.log('Running in local mode. Version:', this.currentVersion);
        return;
    }

    // Compare version numbers
    isNewerVersion(serverVersion, localVersion) {
        const server = serverVersion.split('.').map(Number);
        const local = localVersion.split('.').map(Number);
        
        for (let i = 0; i < Math.max(server.length, local.length); i++) {
            const s = server[i] || 0;
            const l = local[i] || 0;
            if (s > l) return true;
            if (s < l) return false;
        }
        return false;
    }

    // Show update modal
    async showUpdateModal(updateInfo) {
        const modal = document.createElement('div');
        modal.className = 'update-modal-overlay';
        modal.innerHTML = `
            <div class="update-modal">
                <div class="update-icon">
                    <i class="fas fa-download"></i>
                </div>
                <h2>تحديث جديد متاح!</h2>
                <p class="update-version">الإصدار ${updateInfo.version}</p>
                <p class="update-notes">${updateInfo.notes}</p>
                <div class="update-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="updateProgress"></div>
                    </div>
                    <p class="progress-text">يتم الآن تحميل الإضافات الجديدة...</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Perform update
    async performUpdate(updateInfo) {
        try {
            // Verify update signature for security
            if (!this.verifyUpdateSignature(updateInfo)) {
                throw new Error('Invalid update signature');
            }

            // Backup current branding
            this.backupCompanyBranding();

            // Download and apply updates
            await this.downloadUpdates(updateInfo.update_url);
            
            // Update version
            localStorage.setItem('appVersion', updateInfo.version);
            
            // Restore company branding
            this.restoreCompanyBranding();
            
            // Show success and refresh
            this.showUpdateSuccess();
            setTimeout(() => window.location.reload(), 2000);
            
        } catch (error) {
            this.showUpdateError(error.message);
        }
    }

    // Verify update signature (security)
    verifyUpdateSignature(updateInfo) {
        // Simple signature verification - in production use proper cryptographic verification
        const expectedSignature = this.generateSignature(updateInfo.version + updateInfo.update_url);
        return updateInfo.signature === expectedSignature || !updateInfo.signature; // Allow unsigned for demo
    }

    generateSignature(data) {
        // Simple hash for demo - use proper HMAC in production
        return btoa(data).slice(0, 16);
    }

    // Backup company branding
    backupCompanyBranding() {
        const branding = {
            companyName: localStorage.getItem('companyName'),
            companyLogo: localStorage.getItem('companyLogo'),
            companyColors: localStorage.getItem('companyColors'),
            customBranding: localStorage.getItem('customBranding')
        };
        localStorage.setItem('brandingBackup', JSON.stringify(branding));
    }

    // Restore company branding
    restoreCompanyBranding() {
        const backup = JSON.parse(localStorage.getItem('brandingBackup') || '{}');
        Object.keys(backup).forEach(key => {
            if (backup[key]) {
                localStorage.setItem(key.replace('company', '').toLowerCase(), backup[key]);
            }
        });
    }

    // Download updates (simulated)
    async downloadUpdates(updateUrl) {
        const progressBar = document.getElementById('updateProgress');
        
        // Simulate download progress
        for (let i = 0; i <= 100; i += 10) {
            progressBar.style.width = i + '%';
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // In real implementation, download and replace files
        console.log('Updates downloaded from:', updateUrl);
    }

    showUpdateSuccess() {
        const modal = document.querySelector('.update-modal');
        if (modal) {
            modal.innerHTML = `
                <div class="update-icon success">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>تم التحديث بنجاح!</h2>
                <p>سيتم إعادة تشغيل التطبيق...</p>
            `;
        }
    }

    showUpdateError(message) {
        const modal = document.querySelector('.update-modal');
        if (modal) {
            modal.innerHTML = `
                <div class="update-icon error">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h2>فشل في التحديث</h2>
                <p>${message}</p>
                <button onclick="this.closest('.update-modal-overlay').remove()">إغلاق</button>
            `;
        }
    }

    getCompanyId() {
        return localStorage.getItem('companyCode') || 'DEMO';
    }

    // Developer functions
    setVersion(version) {
        if (this.isDeveloper()) {
            localStorage.setItem('appVersion', version);
            return true;
        }
        return false;
    }

    async pushUpdate(updateData) {
        if (!this.isDeveloper()) return false;
        console.log('Local mode - updates stored locally');
        return true;
    }

    async getCompanyVersions() {
        if (!this.isDeveloper()) return [];
        // Return local demo data
        return [
            { companyId: 'COMP001', companyName: 'شركة النيل', version: '2.0.0', lastUpdate: '2024-12-15' },
            { companyId: 'COMP002', companyName: 'مؤسسة البناء', version: '2.0.0', lastUpdate: '2024-12-20' },
            { companyId: 'COMP003', companyName: 'شركة العمران', version: '2.0.0', lastUpdate: '2024-12-25' }
        ];
    }

    isDeveloper() {
        const session = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return session.username === 'developer' || session.role === 'admin';
    }

    getCurrentVersion() {
        return this.currentVersion;
    }
}

// Initialize update manager
const updateManager = new UpdateManager();

// Auto-check for updates on app start
document.addEventListener('DOMContentLoaded', () => {
    updateManager.initializeUpdateCheck();
});

// Make globally available
window.updateManager = updateManager;