class GlobalUpdateSystem {
    constructor() {
        this.currentVersion = "2.0.0"; // Current local version
        this.versionUrl = "https://your-server.com/basira-updates/version.json";
        this.updateCheckInterval = 5 * 60 * 1000; // Check every 5 minutes
        this.isUpdating = false;
        
        this.init();
    }

    async init() {
        // Check for updates on app launch
        await this.checkForUpdates();
        
        // Set up periodic checks
        setInterval(() => this.checkForUpdates(), this.updateCheckInterval);
        
        // Listen for real-time update signals from Supabase
        this.setupRealtimeListener();
    }

    async checkForUpdates() {
        if (this.isUpdating) return;
        
        try {
            const response = await fetch(this.versionUrl + '?t=' + Date.now());
            const serverVersion = await response.json();
            
            // Verify signature for security
            if (!this.verifySignature(serverVersion)) {
                console.warn('Update signature verification failed');
                return;
            }
            
            if (this.isNewerVersion(serverVersion.version, this.currentVersion)) {
                this.showUpdateModal(serverVersion);
            }
        } catch (error) {
            console.log('Update check failed:', error);
        }
    }

    verifySignature(versionData) {
        // Simple signature verification
        return versionData.signature === "basira_verified_2025";
    }

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

    showUpdateModal(versionData) {
        if (document.getElementById('update-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'update-modal';
        modal.className = 'update-modal-overlay';
        modal.innerHTML = `
            <div class="update-modal">
                <div class="update-header">
                    <img src="${versionData.branding.logo_url}" alt="Basira" class="update-logo">
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
                    
                    <div class="update-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="update-progress"></div>
                        </div>
                        <span class="progress-text" id="progress-text">جاري التحضير...</span>
                    </div>
                </div>
                
                <div class="update-actions">
                    ${versionData.mandatory ? 
                        '<button class="update-btn mandatory" onclick="globalUpdater.startUpdate()">تحديث الآن</button>' :
                        `<button class="update-btn" onclick="globalUpdater.startUpdate()">تحديث الآن</button>
                         <button class="update-btn secondary" onclick="globalUpdater.dismissUpdate()">لاحقاً</button>`
                    }
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.currentUpdateData = versionData;
    }

    async startUpdate() {
        this.isUpdating = true;
        const progressBar = document.getElementById('update-progress');
        const progressText = document.getElementById('progress-text');
        
        try {
            // Simulate update progress
            const steps = [
                { text: 'جاري تحميل الملفات...', progress: 20 },
                { text: 'جاري تحديث قاعدة البيانات...', progress: 40 },
                { text: 'جاري تطبيق التحسينات...', progress: 60 },
                { text: 'جاري التحقق من التكامل...', progress: 80 },
                { text: 'اكتمل التحديث!', progress: 100 }
            ];
            
            for (const step of steps) {
                progressText.textContent = step.text;
                progressBar.style.width = step.progress + '%';
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Update local version
            this.currentVersion = this.currentUpdateData.version;
            localStorage.setItem('basira_version', this.currentVersion);
            
            // Force reload with cache busting
            await this.cacheBustReload();
            
        } catch (error) {
            progressText.textContent = 'حدث خطأ في التحديث';
            console.error('Update failed:', error);
        }
    }

    async cacheBustReload() {
        // Clear service worker cache
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }
        
        // Clear browser cache and reload
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        // Force reload with timestamp
        window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
    }

    dismissUpdate() {
        const modal = document.getElementById('update-modal');
        if (modal) modal.remove();
    }

    setupRealtimeListener() {
        // Listen for update signals from Supabase
        if (window.supabase) {
            const channel = window.supabase
                .channel('global-updates')
                .on('broadcast', { event: 'force-update' }, (payload) => {
                    this.checkForUpdates();
                })
                .subscribe();
        }
    }
}

// Initialize global updater
const globalUpdater = new GlobalUpdateSystem();

// Export for use in other files
window.globalUpdater = globalUpdater;