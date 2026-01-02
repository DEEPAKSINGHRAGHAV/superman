const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const mongoose = require('mongoose');

class AccountingService {
    /**
     * Initialize default chart of accounts
     * @param {ObjectId} createdBy - User ID who is creating
     * @returns {Promise<Number>} Number of accounts created
     */
    static async initializeAccounts(createdBy) {
        return await Account.initializeDefaultAccounts(createdBy);
    }

    /**
     * Get account by code
     * @param {String} code - Account code
     * @returns {Promise<Object>} Account
     */
    static async getAccountByCode(code) {
        const account = await Account.findOne({ code, isActive: true });
        if (!account) {
            throw new Error(`Account with code ${code} not found. Please initialize default accounts first by calling POST /api/v1/accounting/initialize`);
        }
        return account;
    }

    /**
     * Check if accounts are initialized, if not initialize them
     * @param {ObjectId} createdBy - User ID
     * @returns {Promise<Boolean>} True if accounts exist or were created
     */
    static async ensureAccountsInitialized(createdBy) {
        const cashAccount = await Account.findOne({ code: '1000', isActive: true });
        if (!cashAccount) {
            console.log('Accounts not initialized. Initializing default accounts...');
            await this.initializeAccounts(createdBy);
            return true;
        }
        return false;
    }

    /**
     * Get account balance
     * @param {String|ObjectId} accountId - Account ID or code
     * @param {Date} asOfDate - Balance as of this date (optional)
     * @returns {Promise<Number>} Account balance
     */
    static async getAccountBalance(accountId, asOfDate = null) {
        let account;
        
        // If accountId is a code (string starting with number), find by code
        if (typeof accountId === 'string' && /^\d{4,6}$/.test(accountId)) {
            account = await Account.findOne({ code: accountId, isActive: true });
        } else {
            account = await Account.findById(accountId);
        }
        
        if (!account) {
            throw new Error('Account not found');
        }
        
        return await JournalEntry.getAccountBalance(account._id, asOfDate);
    }

    /**
     * Create a journal entry
     * @param {Object} entryData - Journal entry data
     * @param {Object} options - Optional session
     * @returns {Promise<Object>} Created journal entry
     */
    static async createJournalEntry(entryData, options = {}) {
        const { session: providedSession } = options;
        
        let shouldEndSession = false;
        let session = providedSession;
        
        if (!session) {
            session = await mongoose.startSession();
            session.startTransaction();
            shouldEndSession = true;
        }
        
        try {
            const {
                date = new Date(),
                description,
                entries,
                referenceType = 'manual',
                referenceId = null,
                referenceNumber = null,
                createdBy,
                notes = null
            } = entryData;
            
            // Validate all accounts exist
            for (const entry of entries) {
                const account = await Account.findById(entry.account).session(session);
                if (!account) {
                    throw new Error(`Account ${entry.account} not found`);
                }
                if (!account.isActive) {
                    throw new Error(`Account ${account.code} is not active`);
                }
            }
            
            // Create journal entry
            const journalEntry = await JournalEntry.create([{
                date,
                description,
                entries,
                referenceType,
                referenceId,
                referenceNumber,
                createdBy,
                notes,
                status: 'posted'
            }], { session });
            
            if (shouldEndSession) {
                await session.commitTransaction();
            }
            
            return journalEntry[0];
        } catch (error) {
            if (shouldEndSession) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            if (shouldEndSession) {
                session.endSession();
            }
        }
    }

    /**
     * Create journal entry for a sale (Bill)
     * @param {Object} saleData - Sale data
     * @param {Object} options - Optional session
     * @returns {Promise<Object>} Created journal entry
     */
    static async createSaleEntry(saleData, options = {}) {
        const {
            billId,
            billNumber,
            totalAmount,
            totalCost,
            paymentMethod,
            customerId = null,
            createdBy
        } = saleData;
        
        const { session: providedSession } = options;
        
        // Ensure accounts are initialized
        await this.ensureAccountsInitialized(createdBy);
        
        // Get account codes
        const cashAccount = await this.getAccountByCode('1000'); // Cash
        const salesAccount = await this.getAccountByCode('4000'); // Sales Revenue
        const cogsAccount = await this.getAccountByCode('5000'); // COGS
        const inventoryAccount = await this.getAccountByCode('1100'); // Inventory
        
        // Determine which account to debit based on payment method
        let debitAccount;
        if (paymentMethod === 'Cash') {
            debitAccount = cashAccount;
        } else {
            // For UPI, Card, Wallet - still goes to Cash account
            // In future, you might want separate accounts for each payment method
            debitAccount = cashAccount;
        }
        
        // Create journal entry lines
        const entries = [
            // Debit: Cash (or Accounts Receivable if credit sale)
            {
                account: debitAccount._id,
                debit: totalAmount,
                credit: 0,
                description: `Sale - ${billNumber}`
            },
            // Credit: Sales Revenue
            {
                account: salesAccount._id,
                debit: 0,
                credit: totalAmount,
                description: `Sales Revenue - ${billNumber}`
            },
            // Debit: COGS
            {
                account: cogsAccount._id,
                debit: totalCost,
                credit: 0,
                description: `COGS - ${billNumber}`
            },
            // Credit: Inventory
            {
                account: inventoryAccount._id,
                debit: 0,
                credit: totalCost,
                description: `Inventory Reduction - ${billNumber}`
            }
        ];
        
        return await this.createJournalEntry({
            date: new Date(),
            description: `Sale transaction - Bill ${billNumber}`,
            entries,
            referenceType: 'sale',
            referenceId: billId,
            referenceNumber: billNumber,
            createdBy
        }, { session: providedSession });
    }

    /**
     * Create journal entry for a purchase (Purchase Order received)
     * @param {Object} purchaseData - Purchase data
     * @param {Object} options - Optional session
     * @returns {Promise<Object>} Created journal entry
     */
    static async createPurchaseEntry(purchaseData, options = {}) {
        const {
            purchaseOrderId,
            orderNumber,
            totalAmount,
            supplierId = null,
            createdBy
        } = purchaseData;
        
        const { session: providedSession } = options;
        
        // Ensure accounts are initialized
        await this.ensureAccountsInitialized(createdBy);
        
        // Get account codes
        const inventoryAccount = await this.getAccountByCode('1100'); // Inventory
        const accountsPayableAccount = await this.getAccountByCode('2000'); // Accounts Payable
        
        // Create journal entry lines
        const entries = [
            // Debit: Inventory
            {
                account: inventoryAccount._id,
                debit: totalAmount,
                credit: 0,
                description: `Purchase - ${orderNumber}`
            },
            // Credit: Accounts Payable
            {
                account: accountsPayableAccount._id,
                debit: 0,
                credit: totalAmount,
                description: `Accounts Payable - ${orderNumber}`
            }
        ];
        
        return await this.createJournalEntry({
            date: new Date(),
            description: `Purchase transaction - PO ${orderNumber}`,
            entries,
            referenceType: 'purchase',
            referenceId: purchaseOrderId,
            referenceNumber: orderNumber,
            createdBy
        }, { session: providedSession });
    }

    /**
     * Create journal entry for an expense
     * @param {Object} expenseData - Expense data
     * @param {Object} options - Optional session
     * @returns {Promise<Object>} Created journal entry
     */
    static async createExpenseEntry(expenseData, options = {}) {
        const {
            expenseId,
            expenseNumber,
            amount,
            category,
            paymentMethod,
            createdBy
        } = expenseData;
        
        const { session: providedSession } = options;
        
        // Get account codes
        const cashAccount = await this.getAccountByCode('1000'); // Cash
        
        // Map expense category to account code
        const expenseAccountMap = {
            'rent': '5100',
            'salaries': '5200',
            'utilities': '5300',
            'marketing': '5400',
            'maintenance': '5500',
            'other': '5600'
        };
        
        const expenseAccountCode = expenseAccountMap[category] || '5600';
        const expenseAccount = await this.getAccountByCode(expenseAccountCode);
        
        // Determine debit account based on payment method
        let creditAccount = cashAccount; // Default to cash
        // In future, if payment is on credit, use Accounts Payable
        
        // Create journal entry lines
        const entries = [
            // Debit: Expense Account
            {
                account: expenseAccount._id,
                debit: amount,
                credit: 0,
                description: `${category} expense - ${expenseNumber}`
            },
            // Credit: Cash (or Accounts Payable)
            {
                account: creditAccount._id,
                debit: 0,
                credit: amount,
                description: `Payment for ${category} - ${expenseNumber}`
            }
        ];
        
        return await this.createJournalEntry({
            date: new Date(),
            description: `Expense transaction - ${category} - ${expenseNumber}`,
            entries,
            referenceType: 'expense',
            referenceId: expenseId,
            referenceNumber: expenseNumber,
            createdBy
        }, { session: providedSession });
    }

    /**
     * Create journal entry for supplier payment
     * @param {Object} paymentData - Payment data
     * @param {Object} options - Optional session
     * @returns {Promise<Object>} Created journal entry
     */
    static async createSupplierPaymentEntry(paymentData, options = {}) {
        const {
            paymentId,
            paymentNumber,
            amount,
            paymentMethod,
            createdBy
        } = paymentData;
        
        const { session: providedSession } = options;
        
        // Get account codes
        const cashAccount = await this.getAccountByCode('1000'); // Cash
        const accountsPayableAccount = await this.getAccountByCode('2000'); // Accounts Payable
        
        // Determine credit account based on payment method
        let debitAccount = cashAccount; // Default to cash
        
        // Create journal entry lines
        const entries = [
            // Debit: Accounts Payable (reducing liability)
            {
                account: accountsPayableAccount._id,
                debit: amount,
                credit: 0,
                description: `Supplier payment - ${paymentNumber}`
            },
            // Credit: Cash
            {
                account: debitAccount._id,
                debit: 0,
                credit: amount,
                description: `Payment to supplier - ${paymentNumber}`
            }
        ];
        
        return await this.createJournalEntry({
            date: new Date(),
            description: `Supplier payment - ${paymentNumber}`,
            entries,
            referenceType: 'payment',
            referenceId: paymentId,
            referenceNumber: paymentNumber,
            createdBy
        }, { session: providedSession });
    }

    /**
     * Get trial balance
     * @param {Date} asOfDate - As of date (optional)
     * @returns {Promise<Array>} Trial balance
     */
    static async getTrialBalance(asOfDate = null) {
        const accounts = await Account.find({ isActive: true }).sort({ code: 1 });
        
        const trialBalance = [];
        
        for (const account of accounts) {
            const balance = await JournalEntry.getAccountBalance(account._id, asOfDate);
            
            // Determine if it's debit or credit balance based on account type
            let debitBalance = 0;
            let creditBalance = 0;
            
            // Assets and Expenses: Debit increases, Credit decreases
            // Liabilities, Equity, Revenue: Credit increases, Debit decreases
            if (account.type === 'asset' || account.type === 'expense') {
                if (balance > 0) {
                    debitBalance = balance;
                } else {
                    creditBalance = Math.abs(balance);
                }
            } else {
                if (balance > 0) {
                    creditBalance = balance;
                } else {
                    debitBalance = Math.abs(balance);
                }
            }
            
            trialBalance.push({
                account: {
                    code: account.code,
                    name: account.name,
                    type: account.type
                },
                debitBalance,
                creditBalance
            });
        }
        
        return trialBalance;
    }

    /**
     * Get account balances summary
     * @param {Date} asOfDate - As of date (optional)
     * @returns {Promise<Object>} Account balances summary
     */
    static async getAccountBalancesSummary(asOfDate = null) {
        const accounts = await Account.getChartOfAccounts();
        
        const summary = {
            assets: [],
            liabilities: [],
            equity: [],
            revenue: [],
            expenses: []
        };
        
        // Calculate balances for each account
        for (const type in accounts) {
            const accountList = accounts[type];
            for (const account of accountList) {
                const balance = await JournalEntry.getAccountBalance(account._id, asOfDate);
                summary[type].push({
                    code: account.code,
                    name: account.name,
                    balance
                });
            }
        }
        
        return summary;
    }

    /**
     * Get Profit & Loss Statement
     * @param {Date} startDate - Start date (optional, defaults to start of year)
     * @param {Date} endDate - End date (optional, defaults to today)
     * @returns {Promise<Object>} P&L Statement
     */
    static async getProfitAndLossStatement(startDate = null, endDate = null) {
        // Ensure dates are set
        if (!startDate) {
            const now = new Date();
            startDate = new Date(now.getFullYear(), 0, 1); // Start of year
        }
        if (!endDate) {
            endDate = new Date();
        }
        
        // Get revenue accounts (4000-4999)
        const revenueAccounts = await Account.find({
            code: { $gte: '4000', $lt: '5000' },
            isActive: true
        }).sort({ code: 1 });
        
        // Get COGS account (5000)
        const cogsAccount = await this.getAccountByCode('5000');
        
        // Get expense accounts (5100-5999)
        const expenseAccounts = await Account.find({
            code: { $gte: '5100', $lt: '6000' },
            isActive: true
        }).sort({ code: 1 });
        
        // Calculate totals for period
        let totalRevenue = 0;
        const revenueDetails = [];
        
        for (const account of revenueAccounts) {
            const startBalance = await JournalEntry.getAccountBalance(account._id, startDate);
            const endBalance = await JournalEntry.getAccountBalance(account._id, endDate);
            // Revenue: positive balance = credit (revenue earned)
            // Period amount = endBalance - startBalance (positive = revenue increase)
            const periodAmount = endBalance - startBalance;
            
            if (periodAmount !== 0) {
                totalRevenue += periodAmount;
                revenueDetails.push({
                    account: {
                        code: account.code,
                        name: account.name
                    },
                    amount: periodAmount
                });
            }
        }
        
        const startCOGS = await JournalEntry.getAccountBalance(cogsAccount._id, startDate);
        const endCOGS = await JournalEntry.getAccountBalance(cogsAccount._id, endDate);
        // COGS: positive balance = debit (expense)
        const totalCOGS = endCOGS - startCOGS;
        
        const grossProfit = totalRevenue - totalCOGS;
        
        let totalExpenses = 0;
        const expenseDetails = [];
        
        for (const account of expenseAccounts) {
            const startBalance = await JournalEntry.getAccountBalance(account._id, startDate);
            const endBalance = await JournalEntry.getAccountBalance(account._id, endDate);
            // Expenses: positive balance = debit (expense)
            const periodAmount = endBalance - startBalance;
            
            if (periodAmount !== 0) {
                totalExpenses += periodAmount;
                expenseDetails.push({
                    account: {
                        code: account.code,
                        name: account.name
                    },
                    amount: periodAmount
                });
            }
        }
        
        const netIncome = grossProfit - totalExpenses;
        
        return {
            period: {
                startDate,
                endDate
            },
            revenue: {
                total: totalRevenue,
                details: revenueDetails
            },
            costOfGoodsSold: {
                total: totalCOGS,
                account: {
                    code: cogsAccount.code,
                    name: cogsAccount.name
                }
            },
            grossProfit: grossProfit,
            expenses: {
                total: totalExpenses,
                details: expenseDetails
            },
            netIncome: netIncome,
            grossProfitMargin: totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0,
            netProfitMargin: totalRevenue > 0 ? parseFloat(((netIncome / totalRevenue) * 100).toFixed(2)) : 0
        };
    }

    /**
     * Get Balance Sheet
     * @param {Date} asOfDate - As of date (optional, defaults to today)
     * @returns {Promise<Object>} Balance Sheet
     */
    static async getBalanceSheet(asOfDate = null) {
        if (!asOfDate) asOfDate = new Date();
        
        // Get all account types
        const assets = await Account.find({
            type: 'asset',
            isActive: true
        }).sort({ code: 1 });
        
        const liabilities = await Account.find({
            type: 'liability',
            isActive: true
        }).sort({ code: 1 });
        
        const equity = await Account.find({
            type: 'equity',
            isActive: true
        }).sort({ code: 1 });
        
        // Calculate balances
        const assetDetails = [];
        let totalAssets = 0;
        
        for (const account of assets) {
            const balance = await JournalEntry.getAccountBalance(account._id, asOfDate);
            // Assets: positive balance = debit (asset value)
            const assetValue = Math.max(0, balance);
            totalAssets += assetValue;
            if (assetValue !== 0) {
                assetDetails.push({
                    account: {
                        code: account.code,
                        name: account.name
                    },
                    balance: assetValue
                });
            }
        }
        
        const liabilityDetails = [];
        let totalLiabilities = 0;
        
        for (const account of liabilities) {
            const balance = await JournalEntry.getAccountBalance(account._id, asOfDate);
            // Liabilities: positive balance = credit (liability amount)
            // For liabilities, we need to invert the balance
            const liabilityAmount = Math.max(0, -balance);
            totalLiabilities += liabilityAmount;
            if (liabilityAmount !== 0) {
                liabilityDetails.push({
                    account: {
                        code: account.code,
                        name: account.name
                    },
                    balance: liabilityAmount
                });
            }
        }
        
        const equityDetails = [];
        let totalEquity = 0;
        
        for (const account of equity) {
            const balance = await JournalEntry.getAccountBalance(account._id, asOfDate);
            // Equity: positive balance = credit (equity value)
            // For equity, we need to invert the balance
            const equityValue = Math.max(0, -balance);
            totalEquity += equityValue;
            if (equityValue !== 0) {
                equityDetails.push({
                    account: {
                        code: account.code,
                        name: account.name
                    },
                    balance: equityValue
                });
            }
        }
        
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
        const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
        
        return {
            asOfDate,
            assets: {
                total: totalAssets,
                details: assetDetails
            },
            liabilities: {
                total: totalLiabilities,
                details: liabilityDetails
            },
            equity: {
                total: totalEquity,
                details: equityDetails
            },
            totalLiabilitiesAndEquity: totalLiabilitiesAndEquity,
            balanced: difference < 0.01, // Allow small rounding differences
            difference: difference
        };
    }
}

module.exports = AccountingService;

