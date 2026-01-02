const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const AccountingService = require('../services/accountingService');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @route   POST /api/v1/accounting/initialize
 * @desc    Initialize default chart of accounts
 * @access  Private (Admin only)
 */
router.post('/initialize', protect, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const count = await AccountingService.initializeAccounts(req.user._id);
    
    res.status(200).json({
        success: true,
        message: `Initialized ${count} default accounts`,
        data: { accountsCreated: count }
    });
}));

/**
 * @route   GET /api/v1/accounting/accounts
 * @desc    Get all accounts (Chart of Accounts)
 * @access  Private
 */
router.get('/accounts', protect, asyncHandler(async (req, res) => {
    const { type, isActive = true } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const accounts = await Account.find(query).sort({ code: 1 });
    
    res.status(200).json({
        success: true,
        count: accounts.length,
        data: accounts
    });
}));

/**
 * @route   GET /api/v1/accounting/accounts/chart
 * @desc    Get chart of accounts grouped by type
 * @access  Private
 */
router.get('/accounts/chart', protect, asyncHandler(async (req, res) => {
    const chart = await Account.getChartOfAccounts();
    
    res.status(200).json({
        success: true,
        data: chart
    });
}));

/**
 * @route   GET /api/v1/accounting/accounts/:id
 * @desc    Get single account
 * @access  Private
 */
router.get('/accounts/:id', protect, asyncHandler(async (req, res) => {
    const account = await Account.findById(req.params.id);
    
    if (!account) {
        return res.status(404).json({
            success: false,
            message: 'Account not found'
        });
    }
    
    res.status(200).json({
        success: true,
        data: account
    });
}));

/**
 * @route   GET /api/v1/accounting/accounts/:id/balance
 * @desc    Get account balance
 * @access  Private
 */
router.get('/accounts/:id/balance', protect, asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;
    const accountId = req.params.id;
    
    const balance = await AccountingService.getAccountBalance(
        accountId,
        asOfDate ? new Date(asOfDate) : null
    );
    
    const account = await Account.findById(accountId);
    
    res.status(200).json({
        success: true,
        data: {
            account: {
                code: account.code,
                name: account.name,
                type: account.type
            },
            balance,
            asOfDate: asOfDate || new Date()
        }
    });
}));

/**
 * @route   POST /api/v1/accounting/accounts
 * @desc    Create new account
 * @access  Private (Admin/Manager only)
 */
router.post('/accounts', protect, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const account = await Account.create({
        ...req.body,
        createdBy: req.user._id
    });
    
    res.status(201).json({
        success: true,
        data: account
    });
}));

/**
 * @route   GET /api/v1/accounting/journal-entries
 * @desc    Get all journal entries
 * @access  Private
 */
router.get('/journal-entries', protect, asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        referenceType,
        accountId,
        page = 1,
        limit = 50
    } = req.query;
    
    const query = { status: 'posted' };
    
    // Date range filter
    if (startDate || endDate) {
        query.date = {};
        if (startDate) {
            query.date.$gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.date.$lte = end;
        }
    }
    
    // Reference type filter
    if (referenceType) {
        query.referenceType = referenceType;
    }
    
    // Account filter
    if (accountId) {
        query['entries.account'] = accountId;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const entries = await JournalEntry.find(query)
        .populate('entries.account', 'code name type')
        .populate('createdBy', 'name email')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    
    const total = await JournalEntry.countDocuments(query);
    
    res.status(200).json({
        success: true,
        count: entries.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: entries
    });
}));

/**
 * @route   GET /api/v1/accounting/journal-entries/:id
 * @desc    Get single journal entry
 * @access  Private
 */
router.get('/journal-entries/:id', protect, asyncHandler(async (req, res) => {
    const entry = await JournalEntry.findById(req.params.id)
        .populate('entries.account', 'code name type')
        .populate('createdBy', 'name email');
    
    if (!entry) {
        return res.status(404).json({
            success: false,
            message: 'Journal entry not found'
        });
    }
    
    res.status(200).json({
        success: true,
        data: entry
    });
}));

/**
 * @route   POST /api/v1/accounting/journal-entries
 * @desc    Create manual journal entry
 * @access  Private (Admin/Manager only)
 */
router.post('/journal-entries', protect, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const entry = await AccountingService.createJournalEntry({
        ...req.body,
        createdBy: req.user._id
    });
    
    const populatedEntry = await JournalEntry.findById(entry._id)
        .populate('entries.account', 'code name type')
        .populate('createdBy', 'name email');
    
    res.status(201).json({
        success: true,
        data: populatedEntry
    });
}));

/**
 * @route   GET /api/v1/accounting/trial-balance
 * @desc    Get trial balance
 * @access  Private
 */
router.get('/trial-balance', protect, asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;
    
    const trialBalance = await AccountingService.getTrialBalance(
        asOfDate ? new Date(asOfDate) : null
    );
    
    // Calculate totals
    const totalDebits = trialBalance.reduce((sum, item) => sum + item.debitBalance, 0);
    const totalCredits = trialBalance.reduce((sum, item) => sum + item.creditBalance, 0);
    
    res.status(200).json({
        success: true,
        data: {
            asOfDate: asOfDate || new Date(),
            accounts: trialBalance,
            totals: {
                totalDebits,
                totalCredits,
                difference: totalDebits - totalCredits
            }
        }
    });
}));

/**
 * @route   GET /api/v1/accounting/account-balances
 * @desc    Get account balances summary
 * @access  Private
 */
router.get('/account-balances', protect, asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;
    
    const summary = await AccountingService.getAccountBalancesSummary(
        asOfDate ? new Date(asOfDate) : null
    );
    
    res.status(200).json({
        success: true,
        data: {
            asOfDate: asOfDate || new Date(),
            ...summary
        }
    });
}));

/**
 * @route   GET /api/v1/accounting/accounts/:id/entries
 * @desc    Get journal entries for a specific account
 * @access  Private
 */
router.get('/accounts/:id/entries', protect, asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const entries = await JournalEntry.findByAccount(
        req.params.id,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
    )
        .populate('entries.account', 'code name type')
        .populate('createdBy', 'name email')
        .sort({ date: -1 });
    
    res.status(200).json({
        success: true,
        count: entries.length,
        data: entries
    });
}));

/**
 * @route   GET /api/v1/accounting/financial/pl-statement
 * @desc    Get Profit & Loss Statement
 * @access  Private
 */
router.get('/financial/pl-statement', protect, asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const plStatement = await AccountingService.getProfitAndLossStatement(
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
    );
    
    res.status(200).json({
        success: true,
        data: plStatement
    });
}));

/**
 * @route   GET /api/v1/accounting/financial/balance-sheet
 * @desc    Get Balance Sheet
 * @access  Private
 */
router.get('/financial/balance-sheet', protect, asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;
    
    const balanceSheet = await AccountingService.getBalanceSheet(
        asOfDate ? new Date(asOfDate) : null
    );
    
    res.status(200).json({
        success: true,
        data: balanceSheet
    });
}));

module.exports = router;

