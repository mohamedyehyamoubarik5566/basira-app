// Wait for SystemConfig to load
if (typeof SystemConfig === 'undefined') {
    console.warn('SystemConfig not loaded yet, waiting...');
    // Wait for SystemConfig to be available
    let configCheckInterval = setInterval(() => {
        if (typeof SystemConfig !== 'undefined') {
            clearInterval(configCheckInterval);
            console.log('SystemConfig loaded successfully');
        }
    }, 100);
}

// Language Management
const langData = {
    ar: {
        'بوابة الدخول 2026': 'بوابة الدخول 2026',
        'نظام إدارة الموارد المتقدم': 'نظام إدارة الموارد المتقدم',
        'المصادقة البيومترية': 'المصادقة البيومترية',
        'أو': 'أو',
        'دخول الشركات': 'دخول الشركات',
        'دخول المطور': 'دخول المطور',
        'كود الشركة': 'كود الشركة',
        'اسم المستخدم': 'اسم المستخدم',
        'كلمة المرور': 'كلمة المرور',
        'مفتاح المطور': 'مفتاح المطور',
        'دخول': 'دخول',
        'نسيت كلمة السر؟': 'نسيت كلمة السر؟',
        'استعادة كلمة المرور': 'استعادة كلمة المرور',
        'أدخل بيانات الشركة ورقم الهاتف المسجل': 'أدخل بيانات الشركة ورقم الهاتف المسجل',
        'رقم الهاتف المسجل': 'رقم الهاتف المسجل',
        'إرسال رمز التحقق': 'إرسال رمز التحقق',
        'أدخل رمز التحقق المرسل إلى هاتفك': 'أدخل رمز التحقق المرسل إلى هاتفك',
        'إعادة الإرسال': 'إعادة الإرسال',
        'تحقق من الرمز': 'تحقق من الرمز',
        'أدخل كلمة المرور الجديدة': 'أدخل كلمة المرور الجديدة',
        'كلمة المرور الجديدة': 'كلمة المرور الجديدة',
        'تأكيد كلمة المرور': 'تأكيد كلمة المرور',
        'تحديث كلمة المرور': 'تحديث كلمة المرور'
    },
    en: {
        'بوابة الدخول 2026': 'Login Portal 2026',
        'نظام إدارة الموارد المتقدم': 'Advanced ERP System',
        'المصادقة البيومترية': 'Biometric Authentication',
        'أو': 'OR',
        'دخول الشركات': 'Corporate Access',
        'دخول المطور': 'Developer Access',
        'كود الشركة': 'Company Code',
        'اسم المستخدم': 'Username',
        'كلمة المرور': 'Password',
        'مفتاح المطور': 'Developer Key',
        'دخول': 'Login',
        'نسيت كلمة السر؟': 'Forgot Password?',
        'استعادة كلمة المرور': 'Password Recovery',
        'أدخل بيانات الشركة ورقم الهاتف المسجل': 'Enter company details and registered mobile',
        'رقم الهاتف المسجل': 'Registered Mobile',
        'إرسال رمز التحقق': 'Send Verification Code',
        'أدخل رمز التحقق المرسل إلى هاتفك': 'Enter the verification code sent to your phone',
        'إعادة الإرسال': 'Resend Code',
        'تحقق من الرمز': 'Verify Code',
        'أدخل كلمة المرور الجديدة': 'Enter your new password',
        'كلمة المرور الجديدة': 'New Password',
        'تأكيد كلمة المرور': 'Confirm Password',
        'تحديث كلمة المرور': 'Update Password'
    }
};

let currentLang = 'ar';

// Forgot Password Variables
let otpTimer;
let otpTimeLeft = 300; // 5 minutes
let resendTimeLeft = 60; // 1 minute
let currentOtp = '123456';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializeLanguage();
        initializeTabs();
        initializeBiometric();
        initializeForm();
        initializeForgotPassword();
    } catch (error) {
        // Initialization error - continuing with basic setup
        // Continue with basic initialization
        initializeLanguage();
        initializeTabs();
        initializeForm();
    }
});

// Language Functions
function initializeLanguage() {
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
        btn.addEventListener('click', () => switchLanguage(btn.dataset.lang));
    });
}

function switchLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Update active button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    
    // Update text content
    document.querySelectorAll('[data-ar]').forEach(element => {
        const key = element.dataset.ar;
        element.textContent = langData[lang][key] || key;
    });
    
    // Update placeholders
    document.querySelectorAll('input[data-ar]').forEach(input => {
        const key = input.dataset.ar;
        input.placeholder = langData[lang][key] || key;
    });
}

// Tab Management
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === `${targetTab}-tab`);
            });
        });
    });
}

// Biometric Authentication
function initializeBiometric() {
    const fingerprintBtn = document.getElementById('fingerprintBtn');
    fingerprintBtn.addEventListener('click', handleBiometricAuth);
}

async function handleBiometricAuth() {
    const fingerprintIcon = document.getElementById('fingerprintBtn');
    
    // Add scanning animation
    fingerprintIcon.style.animation = 'pulse 0.5s ease-in-out infinite';
    
    try {
        // Try Supabase biometric authentication
        if (window.dbManager) {
            const authResult = await dbManager.authenticateBiometric();
            
            if (authResult.user) {
                // Verify user role and company access
                const userRole = await dbManager.verifyUserRole(authResult.user.id);
                
                if (userRole) {
                    // Store session
                    localStorage.setItem('currentUser', JSON.stringify({
                        username: authResult.user.email,
                        role: userRole.role,
                        companyCode: userRole.company_code,
                        loginTime: new Date().toISOString()
                    }));
                    
                    showToast('تم منح الوصول بنجاح', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    throw new Error('لا يوجد صلاحية للوصول');
                }
            }
        } else {
            // Fallback to simulation
            await simulateBiometricScan();
            showToast('تم منح الوصول بنجاح (محاكاة)', 'success');
            
            // Store demo session
            localStorage.setItem('currentUser', JSON.stringify({
                username: 'biometric_user',
                role: 'accountant',
                companyCode: 'DEMO',
                loginTime: new Date().toISOString()
            }));
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    } catch (error) {
        showToast('فشل في المصادقة البيومترية: ' + error.message, 'error');
    } finally {
        fingerprintIcon.style.animation = '';
    }
}

function simulateBiometricScan() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 2000);
    });
}

// Form Management
function initializeForm() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', handleLogin);
}

function handleLogin(e) {
    e.preventDefault();
    e.stopPropagation();
    
    try {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) {
            showToast('خطأ في النظام، يرجى إعادة تحميل الصفحة', 'error');
            return;
        }
        
        const tabId = activeTab.id;
        
        if (tabId === 'developer-tab') {
            handleDeveloperLogin();
        } else if (tabId === 'corporate-tab') {
            handleCorporateLogin();
        } else {
            showToast('يرجى اختيار نوع الدخول', 'error');
        }
    } catch (error) {
        // Login error occurred
        showToast('حدث خطأ أثناء تسجيل الدخول', 'error');
    }
}

function handleDeveloperLogin() {
    const devKey = document.getElementById('devKey').value.trim();
    
    if (!devKey) {
        showToast('يرجى إدخال مفتاح المطور', 'error');
        return;
    }
    
    if (devKey === 'ahmedmohamed4112024') {
        const sessionData = {
            username: 'developer',
            role: 'admin',
            companyCode: 'DEV',
            loginTime: new Date().toISOString(),
            sessionId: 'dev_session_' + Date.now()
        };
        
        localStorage.setItem('currentUser', JSON.stringify(sessionData));
        
        showToast('مرحباً بك في لوحة الإدارة الرئيسية', 'success');
        setTimeout(() => {
            window.location.href = 'control-panel.html';
        }, 1500);
    } else {
        showToast('مفتاح المطور غير صحيح', 'error');
    }
}

function handleCorporateLogin() {
    const companyCode = document.getElementById('companyCode').value.trim();
    
    if (!companyCode) {
        showToast('يرجى إدخال كود الدخول', 'error');
        return;
    }
    
    // Valid company codes
    const validCodes = {
        'BSR001': { role: 'admin', page: 'index.html', name: 'مدير عام' },
        'ACC001': { role: 'accountant', page: 'index.html', name: 'محاسب' },
        'MGR001': { role: 'manager', page: 'budget.html', name: 'مدير' },
        'STF001': { role: 'staff', page: 'staff.html', name: 'موظف' }
    };
    
    const userRole = validCodes[companyCode.toUpperCase()];
    
    if (userRole) {
        const sessionData = {
            username: userRole.name,
            role: userRole.role,
            companyCode: companyCode,
            loginTime: new Date().toISOString(),
            sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };
        
        localStorage.setItem('currentUser', JSON.stringify(sessionData));
        localStorage.setItem('lastCompanyCode', companyCode);
        
        showToast(`مرحباً بك ${userRole.name}`, 'success');
        setTimeout(() => {
            window.location.href = userRole.page;
        }, 1500);
    } else {
        showToast('كود الدخول غير صحيح', 'error');
    }
}

function determineUserRole(username, password) {
    const users = {
        'manager': { password: '123', role: 'manager', page: 'budget.html' },
        'accountant': { password: '123', role: 'accountant', page: 'index.html' },
        'admin': { password: '123', role: 'admin', page: 'control-panel.html' },
        'staff': { password: '123', role: 'staff', page: 'staff.html' }
    };
    
    const user = users[username.toLowerCase()];
    return (user && user.password === password) ? user : null;
}

// Make logout function globally available
window.logout = logout;

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        // Toast element not found - using fallback
        alert(message); // Fallback
        return;
    }
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    // Add styles if not exists
    if (!document.querySelector('#toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(15, 23, 42, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 1rem 1.5rem;
                color: white;
                font-family: 'Cairo', sans-serif;
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                min-width: 300px;
                max-width: 500px;
            }
            
            .toast.show {
                transform: translateX(0);
            }
            
            .toast.success { border-left: 4px solid #10b981; }
            .toast.error { border-left: 4px solid #ef4444; }
            .toast.warning { border-left: 4px solid #f59e0b; }
            .toast.info { border-left: 4px solid #3b82f6; }
        `;
        document.head.appendChild(styles);
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Security Features
document.addEventListener('keydown', function(e) {
    // Developer access trigger (Ctrl + Shift + D)
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        document.querySelector('[data-tab="developer"]').click();
        document.getElementById('devKey').focus();
    }
});



// Logout function
function logout() {
    localStorage.removeItem('currentUser');
    showToast('تم تسجيل الخروج بنجاح', 'success');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}



// Forgot Password Functions
function initializeForgotPassword() {
    const forgotLink = document.getElementById('forgotPasswordLink');
    const forgotOverlay = document.getElementById('forgotOverlay');
    const closeForgot = document.getElementById('closeForgot');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    const resendBtn = document.getElementById('resendBtn');
    
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotOverlay();
    });
    
    closeForgot.addEventListener('click', hideForgotOverlay);
    forgotOverlay.addEventListener('click', (e) => {
        if (e.target === forgotOverlay) hideForgotOverlay();
    });
    
    sendOtpBtn.addEventListener('click', handleSendOtp);
    verifyOtpBtn.addEventListener('click', handleVerifyOtp);
    resetPasswordBtn.addEventListener('click', handleResetPassword);
    resendBtn.addEventListener('click', handleResendOtp);
    
    initializeOtpInputs();
}

function showForgotOverlay() {
    document.getElementById('forgotOverlay').classList.add('active');
    resetForgotSteps();
}

function hideForgotOverlay() {
    document.getElementById('forgotOverlay').classList.remove('active');
    clearInterval(otpTimer);
    resetForgotSteps();
}

function resetForgotSteps() {
    document.querySelectorAll('.forgot-step').forEach(step => step.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    document.getElementById('forgotCompanyCode').value = '';
    document.getElementById('mobileNumber').value = '';
    document.querySelectorAll('.otp-input').forEach(input => input.value = '');
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

function handleSendOtp() {
    const companyCode = document.getElementById('forgotCompanyCode').value;
    const mobile = document.getElementById('mobileNumber').value;
    
    if (!companyCode || !mobile) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    if (mobile.length < 10) {
        showToast('رقم الهاتف غير صحيح', 'error');
        return;
    }
    
    // Simulate sending OTP
    showToast('تم إرسال رمز التحقق إلى هاتفك', 'success');
    setTimeout(() => {
        showToast('رمز التحقق الخاص بك هو: 123456', 'info');
    }, 1000);
    
    showStep(2);
    startOtpTimer();
}

function handleVerifyOtp() {
    const otpInputs = document.querySelectorAll('.otp-input');
    const enteredOtp = Array.from(otpInputs).map(input => input.value).join('');
    
    if (enteredOtp.length !== 6) {
        showToast('يرجى إدخال رمز التحقق كاملاً', 'error');
        return;
    }
    
    if (enteredOtp === currentOtp) {
        showToast('تم التحقق بنجاح', 'success');
        clearInterval(otpTimer);
        showStep(3);
    } else {
        showToast('رمز التحقق غير صحيح', 'error');
        otpInputs.forEach(input => {
            input.value = '';
            input.style.borderColor = 'rgba(255, 68, 68, 0.5)';
        });
        setTimeout(() => {
            otpInputs.forEach(input => {
                input.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            });
        }, 2000);
    }
}

function handleResetPassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!newPassword || !confirmPassword) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('كلمات المرور غير متطابقة', 'error');
        return;
    }
    
    // Simulate password reset
    showToast('تم تحديث كلمة المرور بنجاح', 'success');
    setTimeout(() => {
        hideForgotOverlay();
        showToast('يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة', 'info');
    }, 1500);
}

function handleResendOtp() {
    currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
    showToast('تم إعادة إرسال رمز التحقق', 'success');
    setTimeout(() => {
        showToast(`رمز التحقق الجديد هو: ${currentOtp}`, 'info');
    }, 1000);
    
    startOtpTimer();
    startResendTimer();
}

function showStep(stepNumber) {
    document.querySelectorAll('.forgot-step').forEach(step => step.classList.remove('active'));
    document.getElementById(`step${stepNumber}`).classList.add('active');
}

function startOtpTimer() {
    otpTimeLeft = 300;
    const timerElement = document.getElementById('otpTimer');
    
    otpTimer = setInterval(() => {
        const minutes = Math.floor(otpTimeLeft / 60);
        const seconds = otpTimeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (otpTimeLeft <= 0) {
            clearInterval(otpTimer);
            showToast('انتهت صلاحية رمز التحقق', 'error');
            showStep(1);
        }
        
        otpTimeLeft--;
    }, 1000);
    
    startResendTimer();
}

function startResendTimer() {
    const resendBtn = document.getElementById('resendBtn');
    resendTimeLeft = 60;
    resendBtn.disabled = true;
    
    const resendTimer = setInterval(() => {
        if (resendTimeLeft <= 0) {
            clearInterval(resendTimer);
            resendBtn.disabled = false;
        }
        resendTimeLeft--;
    }, 1000);
}

function initializeOtpInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            if (pastedData.length === 6 && /^\d{6}$/.test(pastedData)) {
                otpInputs.forEach((inp, i) => {
                    inp.value = pastedData[i] || '';
                });
            }
        });
    });
}