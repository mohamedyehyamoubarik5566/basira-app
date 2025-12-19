// Enhanced Login System for Smart Company Access
class SmartLoginSystem {
    constructor() {
        this.currentLanguage = 'ar';
        this.developerKey = 'ahmedmohamed4112024';
        this.lastCompanyCode = localStorage.getItem('lastCompanyCode');
        this.initializeSystem();
    }

    initializeSystem() {
        this.setupEventListeners();
        this.setupBiometricRemembering();
        this.setupDeveloperAccess();
        this.initializeAnimations();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Language switching
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchLanguage(btn.dataset.lang));
        });

        // Biometric authentication
        document.getElementById('fingerprintBtn').addEventListener('click', () => {
            this.handleBiometricAuth();
        });

        // Company code input animation
        document.getElementById('companyCode').addEventListener('input', () => {
            this.showScanningAnimation();
        });
    }

    setupBiometricRemembering() {
        // Show last company if available
        if (this.lastCompanyCode) {
            const biometricText = document.querySelector('.biometric-text');
            biometricText.innerHTML = `
                <span style="font-size: 12px; opacity: 0.8;">آخر شركة:</span><br>
                ${this.lastCompanyCode}
            `;
        }
    }

    setupDeveloperAccess() {
        // Hidden developer access (Ctrl+Shift+D)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                this.switchTab('developer');
                this.showToast('وضع المطور مفعل', 'info');
            }
        });
    }

    async handleLogin() {
        const activeTab = document.querySelector('.tab-content.active').id;
        
        if (activeTab === 'corporate-tab') {
            await this.handleCompanyLogin();
        } else if (activeTab === 'developer-tab') {
            this.handleDeveloperLogin();
        }
    }

    async handleCompanyLogin() {
        const companyCode = document.getElementById('companyCode').value.trim();
        
        if (!companyCode) {
            this.showToast('يرجى إدخال كود الشركة', 'error');
            return;
        }

        this.showScanningAnimation();
        this.showToast('جاري التحقق من كود الشركة...', 'info');

        try {
            // Check company in Supabase
            const company = await this.verifyCompanyCode(companyCode);
            
            if (company) {
                // Store session data
                const sessionData = {
                    companyCode: company.company_code,
                    companyName: company.name,
                    role: 'admin',
                    loginTime: new Date().toISOString(),
                    loginMethod: 'company_code'
                };

                sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
                localStorage.setItem('lastCompanyCode', company.company_code);

                this.showToast(`جاري تهيئة بيئة العمل لشركة ${company.name}...`, 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);

            } else {
                this.hideScanningAnimation();
                this.showToast('كود الشركة غير صحيح أو غير مفعل', 'error');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.hideScanningAnimation();
            this.showToast('خطأ في الاتصال بالخادم', 'error');
        }
    }

    async verifyCompanyCode(companyCode) {
        try {
            // Try Supabase first
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('companies')
                    .select('*')
                    .eq('company_code', companyCode.toUpperCase())
                    .single();

                if (!error && data) {
                    // Check if license is active
                    const licenseExpiry = new Date(data.license_expiry);
                    const today = new Date();
                    
                    if (licenseExpiry >= today) {
                        return data;
                    } else {
                        this.showToast('انتهت صلاحية ترخيص الشركة', 'error');
                        return null;
                    }
                }
            }

            // Fallback to localStorage for demo
            const demoCompanies = {
                'SAFA-2026': { 
                    company_code: 'SAFA-2026', 
                    name: 'شركة الصفا للمقاولات',
                    license_expiry: '2025-12-31'
                },
                'BASIRA-2026': { 
                    company_code: 'BASIRA-2026', 
                    name: 'شركة البصيرة للتقنية',
                    license_expiry: '2025-12-31'
                }
            };

            return demoCompanies[companyCode.toUpperCase()] || null;

        } catch (error) {
            console.error('Error verifying company code:', error);
            return null;
        }
    }

    handleDeveloperLogin() {
        const devKey = document.getElementById('devKey').value.trim();
        
        if (devKey === this.developerKey) {
            const sessionData = {
                role: 'developer',
                loginTime: new Date().toISOString(),
                loginMethod: 'developer_key'
            };

            sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
            this.showToast('مرحباً بك في لوحة المطور', 'success');
            
            setTimeout(() => {
                window.location.href = 'developer-panel.html';
            }, 1500);
        } else {
            this.showToast('مفتاح المطور غير صحيح', 'error');
        }
    }

    async handleBiometricAuth() {
        if (!this.lastCompanyCode) {
            this.showToast('لا توجد بيانات مسجلة للمصادقة البيومترية', 'error');
            return;
        }

        this.startBiometricScan();

        try {
            // Simulate biometric authentication
            await this.simulateBiometricScan();
            
            // Verify the remembered company code
            const company = await this.verifyCompanyCode(this.lastCompanyCode);
            
            if (company) {
                const sessionData = {
                    companyCode: company.company_code,
                    companyName: company.name,
                    role: 'admin',
                    loginTime: new Date().toISOString(),
                    loginMethod: 'biometric'
                };

                sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
                
                this.showToast(`تم تسجيل الدخول بنجاح لشركة ${company.name}`, 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                this.showToast('فشل في التحقق من بيانات الشركة المحفوظة', 'error');
            }

        } catch (error) {
            console.error('Biometric auth error:', error);
            this.showToast('فشل في المصادقة البيومترية', 'error');
        } finally {
            this.stopBiometricScan();
        }
    }

    startBiometricScan() {
        const fingerprintBtn = document.getElementById('fingerprintBtn');
        fingerprintBtn.classList.add('scanning');
        
        const scanAnimation = fingerprintBtn.querySelector('.scan-animation');
        scanAnimation.style.display = 'block';
        
        this.showToast('جاري المسح البيومتري...', 'info');
    }

    stopBiometricScan() {
        const fingerprintBtn = document.getElementById('fingerprintBtn');
        fingerprintBtn.classList.remove('scanning');
        
        const scanAnimation = fingerprintBtn.querySelector('.scan-animation');
        scanAnimation.style.display = 'none';
    }

    async simulateBiometricScan() {
        // Simulate WebAuthn or biometric scanning
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, 3000);
        });
    }

    showScanningAnimation() {
        const indicator = document.getElementById('scanningIndicator');
        indicator.style.display = 'block';
        
        setTimeout(() => {
            this.hideScanningAnimation();
        }, 2000);
    }

    hideScanningAnimation() {
        const indicator = document.getElementById('scanningIndicator');
        indicator.style.display = 'none';
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    switchLanguage(lang) {
        this.currentLanguage = lang;
        
        // Update language buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Update text content
        document.querySelectorAll('[data-ar][data-en]').forEach(element => {
            if (element.tagName === 'INPUT') {
                element.placeholder = element.dataset[lang];
            } else {
                element.textContent = element.dataset[lang];
            }
        });

        // Update document direction
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    }

    initializeAnimations() {
        // Particle animation
        this.createParticles();
        
        // Data stream animation
        this.createDataStream();
    }

    createParticles() {
        const particlesBg = document.querySelector('.particles-bg');
        
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: 2px;
                height: 2px;
                background: rgba(138, 43, 226, 0.6);
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float ${3 + Math.random() * 4}s ease-in-out infinite;
                animation-delay: ${Math.random() * 2}s;
            `;
            particlesBg.appendChild(particle);
        }
    }

    createDataStream() {
        const dataStream = document.querySelector('.data-stream');
        
        setInterval(() => {
            const stream = document.createElement('div');
            stream.className = 'stream-line';
            stream.style.cssText = `
                position: absolute;
                width: 1px;
                height: 20px;
                background: linear-gradient(to bottom, transparent, #8a2be2, transparent);
                left: ${Math.random() * 100}%;
                top: -20px;
                animation: streamDown 2s linear;
            `;
            
            dataStream.appendChild(stream);
            
            setTimeout(() => {
                stream.remove();
            }, 2000);
        }, 200);
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            info: '#8a2be2',
            warning: '#f59e0b'
        };

        toast.style.cssText = `
            display: block;
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            font-family: 'Cairo', sans-serif;
            font-weight: 600;
            z-index: 10000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease;
        `;
        
        toast.textContent = message;
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 300);
        }, 3000);
    }
}

// Initialize the smart login system
document.addEventListener('DOMContentLoaded', () => {
    new SmartLoginSystem();
});

// Add required CSS animations
const style = document.createElement('style');
style.textContent = `
    .company-code-input {
        position: relative;
    }

    .scanning-indicator {
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(138, 43, 226, 0.1);
        border-radius: 12px;
        overflow: hidden;
    }

    .scan-line {
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(138, 43, 226, 0.6), transparent);
        animation: scanMove 2s ease-in-out infinite;
    }

    @keyframes scanMove {
        0% { left: -100%; }
        100% { left: 100%; }
    }

    .fingerprint-icon.scanning {
        animation: biometricPulse 1s ease-in-out infinite;
    }

    @keyframes biometricPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }

    .scan-animation {
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border: 2px solid #8a2be2;
        border-radius: 50%;
        animation: scanRing 2s ease-in-out infinite;
    }

    @keyframes scanRing {
        0% { 
            transform: scale(0.8);
            opacity: 1;
        }
        100% { 
            transform: scale(1.4);
            opacity: 0;
        }
    }

    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
    }

    @keyframes streamDown {
        0% { top: -20px; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { top: 100vh; opacity: 0; }
    }

    @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);