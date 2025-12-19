// Integration script for Client Statement with main ERP system
class StatementIntegration {
    constructor() {
        this.setupEventListeners();
        this.setupAutoLedgerUpdates();
    }

    // Setup event listeners for statement generation
    setupEventListeners() {
        // Add statement buttons to client cards
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="statement"]')) {
                const clientName = e.target.closest('[data-action="statement"]').getAttribute('data-client');
                this.openProfessionalStatement(clientName);
            }
        });

        // Add statement export functionality
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'p' && document.querySelector('.statement-container')) {
                e.preventDefault();
                window.printClientStatement();
            }
        });
    }

    // Open professional statement in new window
    async openProfessionalStatement(clientName) {
        try {
            // Create statement window
            const statementWindow = window.open(
                'kashf-hesab-template.html', 
                `statement_${clientName}`, 
                'width=1200,height=900,scrollbars=yes,resizable=yes'
            );

            if (!statementWindow) {
                throw new Error('فشل في فتح نافذة كشف الحساب. يرجى السماح بالنوافذ المنبثقة.');
            }

            // Wait for window to load
            statementWindow.onload = async () => {
                try {
                    // Set date range (last 3 months)
                    const endDate = new Date();
                    const startDate = new Date();
                    startDate.setMonth(startDate.getMonth() - 3);

                    // Generate statement
                    const result = await statementWindow.generateClientStatement(
                        clientName,
                        startDate.toISOString().split('T')[0],
                        endDate.toISOString().split('T')[0]
                    );

                    if (result.success) {
                        // Add export buttons to the statement window
                        this.addExportButtons(statementWindow);
                        this.showNotification(`تم تحضير كشف حساب ${clientName} بنجاح`, 'success');
                    } else {
                        throw new Error(result.error || 'فشل في تحضير كشف الحساب');
                    }

                } catch (error) {
                    console.error('Error generating statement:', error);
                    this.showNotification('فشل في تحضير كشف الحساب: ' + error.message, 'error');
                    statementWindow.close();
                }
            };

            // Handle window close
            statementWindow.onbeforeunload = () => {
                this.showNotification('تم إغلاق كشف الحساب', 'info');
            };

        } catch (error) {
            console.error('Error opening statement:', error);
            this.showNotification(error.message, 'error');
        }
    }

    // Add export buttons to statement window
    addExportButtons(statementWindow) {
        const exportButtons = statementWindow.document.createElement('div');
        exportButtons.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 10000;
            display: flex;
            gap: 10px;
        `;

        exportButtons.innerHTML = `
            <button onclick="exportStatementToPDF()" style="
                background: linear-gradient(135deg, #8a2be2, #da70d6);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 12px;
                font-family: 'Cairo', sans-serif;
                font-weight: 600;
                cursor: pointer;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <i class="fas fa-file-pdf"></i> تصدير PDF
            </button>
            
            <button onclick="printClientStatement()" style="
                background: rgba(255,255,255,0.1);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 12px 20px;
                border-radius: 12px;
                font-family: 'Cairo', sans-serif;
                font-weight: 600;
                cursor: pointer;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <i class="fas fa-print"></i> طباعة
            </button>
        `;

        statementWindow.document.body.appendChild(exportButtons);
    }

    // Setup automatic ledger updates
    setupAutoLedgerUpdates() {
        // Listen for sales form submissions
        const salesForm = document.getElementById('permissionForm');
        if (salesForm) {
            salesForm.addEventListener('submit', (e) => {
                setTimeout(() => {
                    this.updateClientLedger('sale');
                }, 1000);
            });
        }

        // Listen for payment form submissions
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => {
                setTimeout(() => {
                    this.updateClientLedger('payment');
                }, 1000);
            });
        }

        // Listen for treasury transactions
        const transactionForm = document.getElementById('transactionForm');
        if (transactionForm) {
            transactionForm.addEventListener('submit', (e) => {
                setTimeout(() => {
                    this.updateClientLedger('treasury');
                }, 1000);
            });
        }
    }

    // Update client ledger automatically
    async updateClientLedger(transactionType) {
        try {
            // Create ledger entry based on transaction type
            const ledgerEntry = await this.createLedgerEntry(transactionType);
            
            if (ledgerEntry) {
                // Save to Supabase if available
                if (window.supabase) {
                    await this.saveLedgerToSupabase(ledgerEntry);
                }
                
                // Save to localStorage as backup
                this.saveLedgerToLocalStorage(ledgerEntry);
                
                console.log('Ledger updated:', ledgerEntry);
            }

        } catch (error) {
            console.error('Error updating ledger:', error);
        }
    }

    // Create ledger entry from transaction
    async createLedgerEntry(transactionType) {
        const now = new Date().toISOString();
        
        switch (transactionType) {
            case 'sale':
                const lastSale = this.getLastTransaction('permissions');
                if (lastSale) {
                    return {
                        id: `SALE-${Date.now()}`,
                        client_name: lastSale.clientName,
                        transaction_type: 'debit',
                        amount: parseFloat(lastSale.totalPrice),
                        description: `نقلة مواد - سيارة رقم ${lastSale.carNumber} - إذن رقم ${lastSale.permissionNumber}`,
                        reference_no: lastSale.permissionNumber,
                        created_at: now,
                        status: 'pending'
                    };
                }
                break;

            case 'payment':
                const lastPayment = this.getLastTransaction('clientTransactions');
                if (lastPayment) {
                    return {
                        id: `PAY-${Date.now()}`,
                        client_name: lastPayment.clientName,
                        transaction_type: 'credit',
                        amount: parseFloat(lastPayment.amount),
                        description: lastPayment.description,
                        reference_no: `PAY-${lastPayment.id}`,
                        created_at: now,
                        status: 'paid'
                    };
                }
                break;

            case 'treasury':
                const lastTreasury = this.getLastTransaction('transactions');
                if (lastTreasury && lastTreasury.type === 'income') {
                    // Extract client name from description
                    const clientName = this.extractClientFromDescription(lastTreasury.description);
                    if (clientName) {
                        return {
                            id: `TREAS-${Date.now()}`,
                            client_name: clientName,
                            transaction_type: 'credit',
                            amount: parseFloat(lastTreasury.amount),
                            description: lastTreasury.description,
                            reference_no: `TREAS-${lastTreasury.id}`,
                            created_at: now,
                            status: 'paid'
                        };
                    }
                }
                break;
        }

        return null;
    }

    // Get last transaction from localStorage
    getLastTransaction(storageKey) {
        try {
            const transactions = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return transactions.length > 0 ? transactions[transactions.length - 1] : null;
        } catch (error) {
            console.error('Error getting last transaction:', error);
            return null;
        }
    }

    // Extract client name from transaction description
    extractClientFromDescription(description) {
        // Look for common patterns like "تحصيل من [ClientName]"
        const patterns = [
            /تحصيل من (.+?) -/,
            /دفعة من (.+?) -/,
            /من (.+?) -/,
            /العميل (.+?) -/
        ];

        for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return null;
    }

    // Save ledger entry to Supabase
    async saveLedgerToSupabase(ledgerEntry) {
        try {
            if (!window.supabase) return;

            const { data, error } = await window.supabase
                .from('client_ledger')
                .insert([ledgerEntry]);

            if (error) {
                console.error('Supabase ledger error:', error);
            } else {
                console.log('Ledger saved to Supabase:', data);
            }

        } catch (error) {
            console.error('Error saving to Supabase:', error);
        }
    }

    // Save ledger entry to localStorage
    saveLedgerToLocalStorage(ledgerEntry) {
        try {
            const ledger = JSON.parse(localStorage.getItem('clientLedger') || '[]');
            ledger.push(ledgerEntry);
            localStorage.setItem('clientLedger', JSON.stringify(ledger));
            
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
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
}

// Initialize integration
document.addEventListener('DOMContentLoaded', () => {
    new StatementIntegration();
});

// Export for global use
window.StatementIntegration = StatementIntegration;