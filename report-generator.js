// Professional Client Statement Report Generator
class ClientStatementGenerator {
    constructor() {
        this.currentClient = null;
        this.transactions = [];
        this.companyInfo = {
            name: 'شركة البصيرة للمقاولات',
            address: 'القاهرة، مصر',
            phone: '01234567890',
            taxId: '123456789',
            logo: 'B'
        };
    }

    // Generate statement for a specific client
    async generateStatement(clientName, startDate = null, endDate = null) {
        try {
            this.currentClient = await this.getClientData(clientName);
            if (!this.currentClient) {
                throw new Error(`العميل ${clientName} غير موجود`);
            }

            // Set date range
            const dateRange = this.setDateRange(startDate, endDate);
            
            // Load transactions
            await this.loadTransactions(clientName, dateRange.start, dateRange.end);
            
            // Update UI
            this.updateStatementHeader();
            this.updateClientProfile(dateRange);
            this.renderTransactionTable();
            this.updateFinancialSummary();
            this.updateFooter();
            
            return {
                success: true,
                client: this.currentClient,
                transactions: this.transactions,
                summary: this.calculateSummary()
            };
            
        } catch (error) {
            console.error('Error generating statement:', error);
            this.showError(error.message);
            return { success: false, error: error.message };
        }
    }

    // Get client data from database
    async getClientData(clientName) {
        try {
            // Try Supabase first
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('companies')
                    .select('*')
                    .eq('name', clientName)
                    .single();
                
                if (!error && data) {
                    return {
                        name: data.name,
                        phone: data.phone || 'غير محدد',
                        creditLimit: data.credit_limit || 50000,
                        openingBalance: data.opening_balance || 0
                    };
                }
            }
            
            // Fallback to localStorage
            const clients = JSON.parse(localStorage.getItem('clientsDatabase') || '{}');
            const client = clients[clientName];
            
            if (client) {
                return {
                    name: client.name,
                    phone: client.phone || 'غير محدد',
                    creditLimit: client.creditLimit || 50000,
                    openingBalance: client.openingBalance || 0
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('Error fetching client data:', error);
            return null;
        }
    }

    // Load transactions for the client
    async loadTransactions(clientName, startDate, endDate) {
        this.transactions = [];
        
        try {
            // Load sales transactions
            await this.loadSalesTransactions(clientName, startDate, endDate);
            
            // Load payment transactions
            await this.loadPaymentTransactions(clientName, startDate, endDate);
            
            // Sort by date
            this.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Calculate running balance
            this.calculateRunningBalance();
            
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    // Load sales transactions from Supabase/localStorage
    async loadSalesTransactions(clientName, startDate, endDate) {
        try {
            // Try Supabase first
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('sales')
                    .select('*')
                    .eq('client_name', clientName)
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString())
                    .order('created_at', { ascending: true });
                
                if (!error && data) {
                    data.forEach(sale => {
                        this.transactions.push({
                            date: sale.created_at,
                            refNo: sale.permission_number || sale.id,
                            description: `نقلة مواد - سيارة رقم ${sale.car_number} - إذن رقم ${sale.permission_number}`,
                            debit: parseFloat(sale.total_price),
                            credit: 0,
                            type: 'sale',
                            status: 'pending'
                        });
                    });
                }
            }
            
            // Fallback to localStorage
            const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
            const clientSales = permissions.filter(p => {
                const saleDate = new Date(p.date);
                return p.clientName === clientName && 
                       saleDate >= startDate && 
                       saleDate <= endDate;
            });
            
            clientSales.forEach(sale => {
                this.transactions.push({
                    date: sale.date,
                    refNo: sale.permissionNumber || sale.id,
                    description: `نقلة مواد - سيارة رقم ${sale.carNumber} - إذن رقم ${sale.permissionNumber}`,
                    debit: parseFloat(sale.totalPrice),
                    credit: 0,
                    type: 'sale',
                    status: 'pending'
                });
            });
            
        } catch (error) {
            console.error('Error loading sales transactions:', error);
        }
    }

    // Load payment transactions
    async loadPaymentTransactions(clientName, startDate, endDate) {
        try {
            // Try Supabase first
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('treasury')
                    .select('*')
                    .eq('transaction_type', 'income')
                    .ilike('description', `%${clientName}%`)
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString())
                    .order('created_at', { ascending: true });
                
                if (!error && data) {
                    data.forEach(payment => {
                        this.transactions.push({
                            date: payment.created_at,
                            refNo: `PAY-${payment.id}`,
                            description: payment.description,
                            debit: 0,
                            credit: parseFloat(payment.amount),
                            type: 'payment',
                            status: 'paid'
                        });
                    });
                }
            }
            
            // Fallback to localStorage
            const clientTransactions = JSON.parse(localStorage.getItem('clientTransactions') || '{}');
            const payments = clientTransactions[clientName] || [];
            
            const clientPayments = payments.filter(p => {
                const paymentDate = new Date(p.date);
                return p.type === 'payment' && 
                       paymentDate >= startDate && 
                       paymentDate <= endDate;
            });
            
            clientPayments.forEach(payment => {
                this.transactions.push({
                    date: payment.date,
                    refNo: `PAY-${payment.id}`,
                    description: payment.description,
                    debit: 0,
                    credit: parseFloat(payment.amount),
                    type: 'payment',
                    status: 'paid'
                });
            });
            
        } catch (error) {
            console.error('Error loading payment transactions:', error);
        }
    }

    // Calculate running balance for all transactions
    calculateRunningBalance() {
        let runningBalance = this.currentClient.openingBalance || 0;
        
        this.transactions.forEach(transaction => {
            runningBalance += transaction.debit - transaction.credit;
            transaction.runningBalance = runningBalance;
        });
    }

    // Set date range with defaults
    setDateRange(startDate, endDate) {
        const today = new Date();
        const start = startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth() - 3, 1);
        const end = endDate ? new Date(endDate) : today;
        
        return { start, end };
    }

    // Update statement header
    updateStatementHeader() {
        document.getElementById('companyName').textContent = this.companyInfo.name;
        document.getElementById('companyLogo').textContent = this.companyInfo.logo;
        document.getElementById('reportDate').textContent = new Date().toLocaleDateString('ar-EG');
    }

    // Update client profile section
    updateClientProfile(dateRange) {
        document.getElementById('clientName').textContent = this.currentClient.name;
        document.getElementById('clientPhone').textContent = this.currentClient.phone;
        document.getElementById('creditLimit').textContent = `${this.currentClient.creditLimit.toLocaleString()} ج.م`;
        
        const startStr = dateRange.start.toLocaleDateString('ar-EG');
        const endStr = dateRange.end.toLocaleDateString('ar-EG');
        document.getElementById('dateRange').textContent = `من ${startStr} إلى ${endStr}`;
    }

    // Render transaction table
    renderTransactionTable() {
        const tbody = document.getElementById('transactionTableBody');
        
        if (this.transactions.length === 0) {
            tbody.innerHTML = `
                <div class="table-row" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                    <div style="grid-column: 1 / -1;">لا توجد معاملات في الفترة المحددة</div>
                </div>
            `;
            return;
        }
        
        tbody.innerHTML = this.transactions.map(transaction => {
            const date = new Date(transaction.date);
            const dateStr = date.toLocaleDateString('ar-EG');
            const timeStr = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            
            const balanceClass = transaction.runningBalance >= 0 ? 'balance-positive' : 'balance-negative';
            const statusClass = transaction.status === 'paid' ? 'status-paid' : 'status-pending';
            const statusText = transaction.status === 'paid' ? 'مدفوع' : 'معلق';
            
            return `
                <div class="table-row">
                    <div>
                        <div style="font-weight: 600;">${dateStr}</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.6);">${timeStr}</div>
                    </div>
                    <div>
                        <span class="status-tag ${statusClass}">${transaction.refNo}</span>
                    </div>
                    <div style="text-align: right;">${transaction.description}</div>
                    <div class="amount-debit">
                        ${transaction.debit > 0 ? `${transaction.debit.toFixed(2)} ج.م` : '-'}
                    </div>
                    <div class="amount-credit">
                        ${transaction.credit > 0 ? `${transaction.credit.toFixed(2)} ج.م` : '-'}
                    </div>
                    <div class="${balanceClass}">
                        ${Math.abs(transaction.runningBalance).toFixed(2)} ج.م
                        <div style="font-size: 10px; opacity: 0.7;">
                            ${transaction.runningBalance >= 0 ? 'له عندنا' : 'عليه'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Calculate financial summary
    calculateSummary() {
        const totalDebts = this.transactions.reduce((sum, t) => sum + t.debit, 0);
        const totalPayments = this.transactions.reduce((sum, t) => sum + t.credit, 0);
        const netBalance = (this.currentClient.openingBalance || 0) + totalDebts - totalPayments;
        
        return { totalDebts, totalPayments, netBalance };
    }

    // Update financial summary cards
    updateFinancialSummary() {
        const summary = this.calculateSummary();
        
        document.getElementById('totalDebts').textContent = `${summary.totalDebts.toFixed(2)} ج.م`;
        document.getElementById('totalPayments').textContent = `${summary.totalPayments.toFixed(2)} ج.م`;
        
        const netBalanceElement = document.getElementById('netBalance');
        netBalanceElement.textContent = `${Math.abs(summary.netBalance).toFixed(2)} ج.م`;
        
        // Update color based on balance
        if (summary.netBalance >= 0) {
            netBalanceElement.className = 'summary-amount balance-positive';
        } else {
            netBalanceElement.className = 'summary-amount balance-negative';
        }
    }

    // Update footer with timestamp
    updateFooter() {
        const now = new Date();
        const timestamp = now.toLocaleString('ar-EG');
        document.getElementById('printTimestamp').textContent = timestamp;
    }

    // Export to PDF with professional formatting
    async exportToPDF() {
        try {
            const { jsPDF } = window.jspdf;
            
            // Create new PDF document
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Add Arabic font support
            pdf.addFont('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700', 'Cairo', 'normal');
            pdf.setFont('Cairo');
            
            // Capture the statement container
            const element = document.querySelector('.statement-container');
            
            // Use html2canvas to capture the element
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            
            let position = 0;
            
            // Add first page
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            // Add additional pages if needed
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            // Add watermark
            pdf.setFontSize(60);
            pdf.setTextColor(240, 240, 240);
            pdf.text('البصيرة', 105, 150, { align: 'center', angle: 45 });
            
            // Generate filename
            const clientName = this.currentClient.name.replace(/\s+/g, '_');
            const date = new Date().toISOString().split('T')[0];
            const filename = `كشف_حساب_${clientName}_${date}.pdf`;
            
            // Save the PDF
            pdf.save(filename);
            
            this.showSuccess('تم تصدير كشف الحساب بنجاح');
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showError('فشل في تصدير كشف الحساب');
        }
    }

    // Print statement
    printStatement() {
        try {
            // Optimize for printing
            document.body.classList.add('printing');
            
            // Trigger print
            window.print();
            
            // Remove print class after printing
            setTimeout(() => {
                document.body.classList.remove('printing');
            }, 1000);
            
        } catch (error) {
            console.error('Error printing statement:', error);
            this.showError('فشل في طباعة كشف الحساب');
        }
    }

    // Show success message
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showNotification(message, 'error');
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 
                        type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                        'rgba(138, 43, 226, 0.9)'};
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            font-family: 'Cairo', sans-serif;
            font-weight: 600;
            z-index: 10000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Auto-update when sales/payments are added
    setupAutoUpdate() {
        // Listen for sales updates
        if (window.supabase) {
            window.supabase
                .channel('statement-updates')
                .on('postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'sales' }, 
                    (payload) => {
                        if (payload.new.client_name === this.currentClient?.name) {
                            this.refreshStatement();
                        }
                    }
                )
                .on('postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'treasury' }, 
                    (payload) => {
                        if (payload.new.description?.includes(this.currentClient?.name)) {
                            this.refreshStatement();
                        }
                    }
                )
                .subscribe();
        }
    }

    // Refresh current statement
    async refreshStatement() {
        if (this.currentClient) {
            await this.generateStatement(this.currentClient.name);
            this.showSuccess('تم تحديث كشف الحساب تلقائياً');
        }
    }
}

// Initialize the report generator
const reportGenerator = new ClientStatementGenerator();

// Global functions for easy access
window.generateClientStatement = (clientName, startDate, endDate) => {
    return reportGenerator.generateStatement(clientName, startDate, endDate);
};

window.exportStatementToPDF = () => {
    return reportGenerator.exportToPDF();
};

window.printClientStatement = () => {
    return reportGenerator.printStatement();
};

// Setup auto-updates
document.addEventListener('DOMContentLoaded', () => {
    reportGenerator.setupAutoUpdate();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientStatementGenerator;
}