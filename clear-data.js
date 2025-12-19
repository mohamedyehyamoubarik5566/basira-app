// تصفير جميع البيانات المحفوظة
function clearAllData() {
    if (confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
        // قائمة جميع مفاتيح البيانات المحفوظة
        const dataKeys = [
            'permissions',
            'clientsDatabase',
            'clientTransactions', 
            'transactions',
            'checks',
            'purchases',
            'suppliers',
            'carsDatabase',
            'clientAccounts',
            'carData'
        ];
        
        // حذف البيانات العامة
        dataKeys.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // حذف البيانات الخاصة بالشركات
        const companies = ['default', 'company1', 'company2', 'company3'];
        companies.forEach(company => {
            localStorage.removeItem(`clientsDatabase_${company}`);
        });
        
        alert('تم حذف جميع البيانات بنجاح!');
        location.reload();
    }
}

// إضافة زر التصفير للوحة التحكم
document.addEventListener('DOMContentLoaded', function() {
    // يمكن استدعاء هذه الدالة من console المتصفح: clearAllData()
    console.log('لتصفير جميع البيانات، اكتب: clearAllData()');
});