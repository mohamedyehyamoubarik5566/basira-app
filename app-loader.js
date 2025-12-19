// Dynamic App Loader - Centralized Core with Company Context
class AppLoader {
    constructor() {
        this.currentCompany = null;
        this.isInitialized = false;
        this.loadingSteps = [
            'تحميل إعدادات النظام...',
            'فحص قاعدة البيانات...',
            'تحميل بيانات الشركة...',
            'تهيئة واجهة المستخدم...',
            'اكتمال التحميل!'
        ];
        this.currentStep = 0;
    }

    // Initialize the application
    async initialize() {
        if (this.isInitialized) return;

        try {
            this.showLoadingScreen();
            
            // Step 1: Load system configuration
            await this.loadSystemConfig();
            this.updateLoadingStep();

            // Step 2: Initialize database and check schema
            await this.initializeDatabase();
            this.updateLoadingStep();

            // Step 3: Load company context
            await this.loadCompanyContext();
            this.updateLoadingStep();

            // Step 4: Initialize UI components
            await this.initializeUI();
            this.updateLoadingStep();

            // Step 5: Complete initialization
            this.completeInitialization();
            this.updateLoadingStep();

            this.isInitialized = true;
            this.hideLoadingScreen();

        } catch (error) {
            console.error('App initialization failed:', error);
            this.showInitializationError(error);
        }
    }

    // Load system configuration
    async loadSystemConfig() {
        // System config is already loaded via system-config.js
        // Verify it's available
        if (!window.SystemConfig) {
            throw new Error('System configuration not loaded');
        }

        // Initialize Supabase client (optional)
        window.supabase = initializeSupabase();
        if (!window.supabase) {
            console.warn('Database connection not available, using local storage');
        }
    }

    // Initialize database and run schema checks
    async initializeDatabase() {
        // Initialize schema manager
        window.schemaManager = initializeSchemaManager();
        await window.schemaManager.initialize();

        // Initialize maintenance manager
        window.maintenanceManager = initializeMaintenanceManager();
    }

    // Load company-specific context
    async loadCompanyContext() {
        const session = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (!session) {
            // No active session, use default company
            this.currentCompany = {
                company_code: 'DEFAULT',
                name: 'شركة البصيرة',
                features: ['sales', 'treasury', 'staff']
            };
            return;
        }

        const userData = JSON.parse(session);
        
        if (userData.companyCode && window.supabase) {
            this.currentCompany = await this.fetchCompanyData(userData.companyCode);
            
            if (!this.currentCompany) {
                this.currentCompany = {
                    company_code: userData.companyCode || 'DEFAULT',
                    name: 'شركة البصيرة',
                    features: ['sales', 'treasury', 'staff']
                };
            }

            // Set company context for RLS
            await this.setCompanyContext(userData.companyCode);
        } else {
            this.currentCompany = {
                company_code: 'DEFAULT',
                name: 'شركة البصيرة',
                features: ['sales', 'treasury', 'staff']
            };
        }
    }

    // Fetch company data from database
    async fetchCompanyData(companyCode) {
        try {
            const { data, error } = await window.supabase
                .from('companies')
                .select('*')
                .eq('company_code', companyCode)
                .single();

            if (error) {
                console.error('Error fetching company data:', error);
                return null;
            }

            return data;

        } catch (error) {
            console.error('Error in fetchCompanyData:', error);
            return null;
        }
    }

    // Set company context for Row Level Security
    async setCompanyContext(companyCode) {
        try {
            // Set the company context for RLS policies
            const { error } = await window.supabase.rpc('set_config', {
                setting_name: 'app.current_company_code',
                setting_value: companyCode,
                is_local: true
            });

            if (error) {
                console.warn('Could not set company context:', error);
            }

        } catch (error) {
            console.warn('Error setting company context:', error);
        }
    }

    // Initialize UI components
    async initializeUI() {
        // Update company branding
        if (this.currentCompany) {
            this.updateCompanyBranding();
        }

        // Initialize dynamic components
        await this.loadDynamicComponents();

        // Setup real-time subscriptions
        this.setupRealtimeSubscriptions();
    }

    // Update company branding in UI
    updateCompanyBranding() {
        const companyNameElements = document.querySelectorAll('[data-company-name]');
        companyNameElements.forEach(element => {
            element.textContent = this.currentCompany.name;
        });

        const companyLogoElements = document.querySelectorAll('[data-company-logo]');
        companyLogoElements.forEach(element => {
            if (this.currentCompany.logo_url) {
                element.src = this.currentCompany.logo_url;
            }
        });

        // Update page title
        document.title = `${this.currentCompany.name} - نظام إدارة الموارد`;
    }

    // Load dynamic components based on company features
    async loadDynamicComponents() {
        // Skip dynamic module loading in localStorage mode
        console.log('Dynamic module loading disabled in localStorage mode');
    }

    // Load specific feature module
    async loadFeatureModule(featureName) {
        try {
            const moduleUrl = `modules/${featureName}.js?v=${SystemConfig.version.current}`;
            
            // Dynamically import the module
            const module = await import(moduleUrl);
            
            if (module.initialize) {
                await module.initialize(this.currentCompany);
            }

        } catch (error) {
            console.warn(`Could not load feature module: ${featureName}`, error);
        }
    }

    // Setup real-time subscriptions for company data
    setupRealtimeSubscriptions() {
        if (!this.currentCompany || !window.supabase) {
            console.warn('Real-time subscriptions not available');
            return;
        }

        const companyCode = this.currentCompany.company_code;

        try {
            // Subscribe to sales updates
            window.supabase
                .channel(`sales_${companyCode}`)
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'sales',
                        filter: `company_code=eq.${companyCode}`
                    }, 
                    (payload) => {
                        this.handleRealtimeUpdate('sales', payload);
                    }
                )
                .subscribe();

            // Subscribe to treasury updates
            window.supabase
                .channel(`treasury_${companyCode}`)
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'treasury',
                        filter: `company_code=eq.${companyCode}`
                    }, 
                    (payload) => {
                        this.handleRealtimeUpdate('treasury', payload);
                    }
                )
                .subscribe();
        } catch (error) {
            console.warn('Error setting up real-time subscriptions:', error);
        }
    }

    // Handle real-time updates
    handleRealtimeUpdate(table, payload) {
        // Dispatch custom event for components to listen to
        const event = new CustomEvent('realtimeUpdate', {
            detail: { table, payload }
        });
        document.dispatchEvent(event);
    }

    // Complete initialization
    completeInitialization() {
        // Mark app as ready
        document.body.classList.add('app-ready');
        
        // Dispatch app ready event
        const event = new CustomEvent('appReady', {
            detail: { company: this.currentCompany }
        });
        document.dispatchEvent(event);
    }

    // Show loading screen
    showLoadingScreen() {
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'app-loading-screen';
        loadingScreen.innerHTML = `
            <div class="loading-container">
                <div class="loading-logo">
                    <div class="logo-animation"></div>
                    <h2>نظام إدارة الموارد</h2>
                </div>
                
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="loading-progress"></div>
                    </div>
                    <p class="loading-text" id="loading-text">جاري تحميل النظام...</p>
                </div>
                
                <div class="loading-steps" id="loading-steps">
                    ${this.loadingSteps.map((step, index) => 
                        `<div class="step ${index === 0 ? 'active' : ''}">${step}</div>`
                    ).join('')}
                </div>
            </div>
        `;

        // Add loading styles
        const style = document.createElement('style');
        style.textContent = `
            #app-loading-screen {
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

            .loading-container {
                text-align: center;
                max-width: 400px;
                width: 90%;
            }

            .loading-logo {
                margin-bottom: 40px;
            }

            .logo-animation {
                width: 80px;
                height: 80px;
                margin: 0 auto 20px;
                background: linear-gradient(135deg, #8a2be2, #da70d6);
                border-radius: 50%;
                animation: logoSpin 2s linear infinite;
            }

            .loading-logo h2 {
                color: #da70d6;
                font-size: 24px;
                font-weight: 600;
            }

            .loading-progress {
                margin-bottom: 30px;
            }

            .progress-bar {
                width: 100%;
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 15px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #8a2be2, #da70d6);
                width: 0%;
                transition: width 0.5s ease;
            }

            .loading-text {
                color: rgba(255, 255, 255, 0.8);
                font-size: 16px;
            }

            .loading-steps {
                text-align: right;
            }

            .step {
                color: rgba(255, 255, 255, 0.4);
                font-size: 14px;
                margin-bottom: 8px;
                transition: color 0.3s ease;
            }

            .step.active {
                color: #da70d6;
            }

            .step.completed {
                color: #22c55e;
            }

            @keyframes logoSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(loadingScreen);
    }

    // Update loading step
    updateLoadingStep() {
        const progressFill = document.getElementById('loading-progress');
        const loadingText = document.getElementById('loading-text');
        const steps = document.querySelectorAll('.step');

        if (this.currentStep > 0) {
            steps[this.currentStep - 1].classList.remove('active');
            steps[this.currentStep - 1].classList.add('completed');
        }

        if (this.currentStep < this.loadingSteps.length) {
            steps[this.currentStep].classList.add('active');
            loadingText.textContent = this.loadingSteps[this.currentStep];
        }

        const progress = ((this.currentStep + 1) / this.loadingSteps.length) * 100;
        progressFill.style.width = `${progress}%`;

        this.currentStep++;
    }

    // Hide loading screen
    hideLoadingScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('app-loading-screen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                loadingScreen.style.transition = 'opacity 0.5s ease';
                setTimeout(() => loadingScreen.remove(), 500);
            }
        }, 1000);
    }

    // Show initialization error
    showInitializationError(error) {
        const errorScreen = document.createElement('div');
        errorScreen.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(239, 68, 68, 0.9);
                color: white;
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                font-family: 'Cairo', sans-serif;
                z-index: 1000000;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3>فشل في تحميل النظام</h3>
                <p>${error.message}</p>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #ef4444;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    margin-top: 20px;
                    cursor: pointer;
                ">إعادة المحاولة</button>
            </div>
        `;
        document.body.appendChild(errorScreen);
    }

    // Get current company data
    getCurrentCompany() {
        return this.currentCompany;
    }

    // Reload company data
    async reloadCompanyData() {
        if (this.currentCompany) {
            this.currentCompany = await this.fetchCompanyData(this.currentCompany.company_code);
            this.updateCompanyBranding();
        }
    }
}

// Initialize app loader
let appLoader = null;

function initializeApp() {
    if (!appLoader) {
        appLoader = new AppLoader();
    }
    return appLoader.initialize();
}

// Export for global use
if (typeof window !== 'undefined') {
    window.AppLoader = AppLoader;
    window.initializeApp = initializeApp;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppLoader, initializeApp };
}