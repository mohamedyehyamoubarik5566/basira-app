// Maintenance Mode and Hot-Swap Manager
class MaintenanceManager {
    constructor() {
        this.isMaintenanceMode = false;
        this.hotSwapEnabled = SystemConfig.system.hotSwapEnabled;
        this.currentVersion = SystemConfig.version.current;
        this.checkInterval = 30000; // Check every 30 seconds
        this.versionCheckTimer = null;
    }

    // Initialize maintenance monitoring
    initialize() {
        this.checkMaintenanceStatus();
        this.startVersionMonitoring();
        this.setupHotSwap();
    }

    // Check if system is in maintenance mode
    async checkMaintenanceStatus() {
        try {
            const response = await fetch(`${SystemConfig.assets.baseUrl}/api/maintenance-status`);
            const status = await response.json();
            
            if (status.maintenance !== this.isMaintenanceMode) {
                this.isMaintenanceMode = status.maintenance;
                
                if (this.isMaintenanceMode) {
                    this.showMaintenanceScreen();
                } else {
                    this.hideMaintenanceScreen();
                }
            }
            
        } catch (error) {
            // Fallback to config value
            this.isMaintenanceMode = SystemConfig.system.maintenanceMode;
        }
    }

    // Show professional maintenance screen
    showMaintenanceScreen() {
        const maintenanceOverlay = document.createElement('div');
        maintenanceOverlay.id = 'maintenance-overlay';
        maintenanceOverlay.innerHTML = `
            <div class="maintenance-container">
                <div class="maintenance-content">
                    <div class="maintenance-icon">
                        <i class="fas fa-cogs"></i>
                        <div class="gear-animation"></div>
                    </div>
                    
                    <h2 class="maintenance-title">تحسين النظام</h2>
                    <p class="maintenance-message">${SystemConfig.messages.maintenance.ar}</p>
                    
                    <div class="maintenance-progress">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <span class="progress-text">جاري التحديث...</span>
                    </div>
                    
                    <div class="maintenance-info">
                        <div class="info-item">
                            <i class="fas fa-shield-check"></i>
                            <span>بياناتك محمية بالكامل</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <span>سنعود خلال دقائق قليلة</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #maintenance-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Cairo', sans-serif;
            }

            .maintenance-container {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 60px 40px;
                text-align: center;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }

            .maintenance-icon {
                position: relative;
                width: 100px;
                height: 100px;
                margin: 0 auto 30px;
                background: linear-gradient(135deg, #8a2be2, #da70d6);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                color: white;
                animation: maintenancePulse 2s ease-in-out infinite;
            }

            .gear-animation {
                position: absolute;
                width: 120px;
                height: 120px;
                border: 2px solid rgba(138, 43, 226, 0.3);
                border-radius: 50%;
                border-top-color: #8a2be2;
                animation: spin 3s linear infinite;
            }

            .maintenance-title {
                font-size: 32px;
                font-weight: 700;
                color: #da70d6;
                margin-bottom: 15px;
            }

            .maintenance-message {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 40px;
                line-height: 1.6;
            }

            .maintenance-progress {
                margin-bottom: 40px;
            }

            .progress-bar {
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 15px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #8a2be2, #da70d6);
                border-radius: 10px;
                animation: progressMove 2s ease-in-out infinite;
            }

            .progress-text {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.7);
            }

            .maintenance-info {
                display: flex;
                justify-content: center;
                gap: 30px;
                flex-wrap: wrap;
            }

            .info-item {
                display: flex;
                align-items: center;
                gap: 10px;
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
            }

            .info-item i {
                color: #22c55e;
            }

            @keyframes maintenancePulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @keyframes progressMove {
                0% { width: 0%; }
                50% { width: 70%; }
                100% { width: 100%; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(maintenanceOverlay);
    }

    // Hide maintenance screen
    hideMaintenanceScreen() {
        const overlay = document.getElementById('maintenance-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Start monitoring for version changes
    startVersionMonitoring() {
        if (!this.hotSwapEnabled) return;

        this.versionCheckTimer = setInterval(async () => {
            await this.checkForUpdates();
        }, this.checkInterval);
    }

    // Check for new version and trigger hot-swap
    async checkForUpdates() {
        try {
            const response = await fetch(`${SystemConfig.assets.baseUrl}/api/version?t=${Date.now()}`);
            const versionInfo = await response.json();
            
            if (versionInfo.version !== this.currentVersion) {
                await this.performHotSwap(versionInfo.version);
            }
            
        } catch (error) {
            console.log('Version check failed:', error);
        }
    }

    // Perform hot-swap of assets
    async performHotSwap(newVersion) {
        try {
            this.showHotSwapNotification();
            
            // Update version parameter for all assets
            await this.updateAssetVersions(newVersion);
            
            // Update system config
            SystemConfig.version.current = newVersion;
            this.currentVersion = newVersion;
            
            // Trigger schema check for new version
            if (window.schemaManager) {
                await window.schemaManager.forceSchemaCheck();
            }
            
            this.hideHotSwapNotification();
            this.showUpdateSuccessNotification(newVersion);
            
        } catch (error) {
            console.error('Hot-swap failed:', error);
            this.showUpdateErrorNotification();
        }
    }

    // Update asset versions with cache busting
    async updateAssetVersions(newVersion) {
        const assets = [
            { selector: 'script[src*="script.js"]', attr: 'src', file: 'script.js' },
            { selector: 'script[src*="login-script"]', attr: 'src', file: 'login-script-updated.js' },
            { selector: 'link[href*="style.css"]', attr: 'href', file: 'style.css' },
            { selector: 'link[href*="login-style.css"]', attr: 'href', file: 'login-style.css' }
        ];

        for (const asset of assets) {
            const elements = document.querySelectorAll(asset.selector);
            elements.forEach(element => {
                const newUrl = `${asset.file}?v=${newVersion}`;
                element[asset.attr] = newUrl;
            });
        }

        // Force reload of dynamic modules
        if (window.location.reload && Math.random() < 0.1) {
            // Occasionally do a full reload to ensure consistency
            setTimeout(() => window.location.reload(), 2000);
        }
    }

    // Setup hot-swap infrastructure
    setupHotSwap() {
        // Add version parameters to existing assets
        document.addEventListener('DOMContentLoaded', () => {
            this.addVersionToAssets();
        });

        // Listen for manual refresh requests
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                this.forceHotSwap();
            }
        });
    }

    // Add version parameters to all assets
    addVersionToAssets() {
        const version = SystemConfig.assets.cacheBuster();
        
        document.querySelectorAll('script[src], link[href]').forEach(element => {
            const attr = element.tagName === 'SCRIPT' ? 'src' : 'href';
            const url = element[attr];
            
            if (url && !url.includes('?v=') && !url.startsWith('http')) {
                element[attr] = `${url}?v=${version}`;
            }
        });
    }

    // Force hot-swap (manual trigger)
    async forceHotSwap() {
        const newVersion = SystemConfig.assets.cacheBuster();
        await this.performHotSwap(newVersion);
    }

    // Show hot-swap notification
    showHotSwapNotification() {
        const notification = document.createElement('div');
        notification.id = 'hotswap-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(138, 43, 226, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            font-family: 'Cairo', sans-serif;
            z-index: 10000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        notification.innerHTML = `
            <i class="fas fa-sync fa-spin"></i>
            جاري تحديث النظام...
        `;
        document.body.appendChild(notification);
    }

    // Hide hot-swap notification
    hideHotSwapNotification() {
        const notification = document.getElementById('hotswap-notification');
        if (notification) {
            notification.remove();
        }
    }

    // Show update success notification
    showUpdateSuccessNotification(version) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(34, 197, 94, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            font-family: 'Cairo', sans-serif;
            z-index: 10000;
            backdrop-filter: blur(10px);
        `;
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            تم التحديث إلى الإصدار ${version}
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }

    // Show update error notification
    showUpdateErrorNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(239, 68, 68, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            font-family: 'Cairo', sans-serif;
            z-index: 10000;
        `;
        notification.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            فشل في التحديث
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }

    // Cleanup
    destroy() {
        if (this.versionCheckTimer) {
            clearInterval(this.versionCheckTimer);
        }
    }
}

// Initialize maintenance manager
let maintenanceManager = null;

function initializeMaintenanceManager() {
    if (!maintenanceManager) {
        maintenanceManager = new MaintenanceManager();
        maintenanceManager.initialize();
    }
    return maintenanceManager;
}

// Export for global use
if (typeof window !== 'undefined') {
    window.MaintenanceManager = MaintenanceManager;
    window.initializeMaintenanceManager = initializeMaintenanceManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MaintenanceManager, initializeMaintenanceManager };
}