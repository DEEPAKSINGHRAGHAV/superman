const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const AccountBalanceSnapshot = require('../models/AccountBalanceSnapshot');
const mongoose = require('mongoose');

/**
 * Generate balance snapshots for all accounts
 * Should run daily at midnight
 * 
 * This job creates snapshots of account balances at the end of each day,
 * enabling fast balance calculations by only processing entries since the last snapshot.
 */
async function generateBalanceSnapshots() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get yesterday's date for snapshot (end of day)
    const snapshotDate = new Date(today);
    snapshotDate.setDate(snapshotDate.getDate() - 1);
    snapshotDate.setHours(23, 59, 59, 999);
    
    const period = `${snapshotDate.getFullYear()}-${String(snapshotDate.getMonth() + 1).padStart(2, '0')}`;
    
    console.log(`[Accounting Snapshot Job] Generating balance snapshots for ${snapshotDate.toISOString()} (period: ${period})...`);
    
    const accounts = await Account.find({ isActive: true });
    const snapshots = [];
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const account of accounts) {
        try {
            // Check if snapshot already exists for this period
            const existing = await AccountBalanceSnapshot.findOne({
                account: account._id,
                period: period
            });
            
            if (existing) {
                console.log(`[Accounting Snapshot Job] Snapshot already exists for account ${account.code} (${account.name}) period ${period}`);
                skippedCount++;
                continue;
            }
            
            // Get latest snapshot before this date
            const latestSnapshot = await AccountBalanceSnapshot.getLatestSnapshot(
                account._id,
                snapshotDate
            );
            
            let balance = 0;
            let debitTotal = 0;
            let creditTotal = 0;
            
            if (latestSnapshot) {
                // Calculate from latest snapshot (incremental)
                const deltaResult = await JournalEntry.aggregate([
                    {
                        $match: {
                            'entries.account': account._id,
                            date: {
                                $gt: latestSnapshot.asOfDate,
                                $lte: snapshotDate
                            },
                            status: 'posted'
                        }
                    },
                    { $unwind: '$entries' },
                    {
                        $match: {
                            'entries.account': account._id
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalDebit: { $sum: '$entries.debit' },
                            totalCredit: { $sum: '$entries.credit' }
                        }
                    }
                ]);
                
                const delta = (deltaResult[0]?.totalDebit || 0) - (deltaResult[0]?.totalCredit || 0);
                balance = latestSnapshot.balance + delta;
                debitTotal = latestSnapshot.debitTotal + (deltaResult[0]?.totalDebit || 0);
                creditTotal = latestSnapshot.creditTotal + (deltaResult[0]?.totalCredit || 0);
            } else {
                // First snapshot - calculate from beginning
                const allEntries = await JournalEntry.aggregate([
                    {
                        $match: {
                            'entries.account': account._id,
                            date: { $lte: snapshotDate },
                            status: 'posted'
                        }
                    },
                    { $unwind: '$entries' },
                    {
                        $match: {
                            'entries.account': account._id
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalDebit: { $sum: '$entries.debit' },
                            totalCredit: { $sum: '$entries.credit' }
                        }
                    }
                ]);
                
                balance = (allEntries[0]?.totalDebit || 0) - (allEntries[0]?.totalCredit || 0);
                debitTotal = allEntries[0]?.totalDebit || 0;
                creditTotal = allEntries[0]?.totalCredit || 0;
                
                // Normalize based on account type
                if (account.type === 'liability' || account.type === 'equity' || account.type === 'revenue') {
                    // For credit accounts, invert the balance
                    balance = -balance;
                }
            }
            
            snapshots.push({
                account: account._id,
                balance: balance,
                asOfDate: snapshotDate,
                period: period,
                debitTotal: debitTotal,
                creditTotal: creditTotal
            });
            
            createdCount++;
            
        } catch (error) {
            console.error(`[Accounting Snapshot Job] Error processing account ${account.code}:`, error);
            // Continue with other accounts
        }
    }
    
    if (snapshots.length > 0) {
        try {
            await AccountBalanceSnapshot.insertMany(snapshots);
            console.log(`[Accounting Snapshot Job] ✅ Created ${createdCount} balance snapshots, skipped ${skippedCount} (already exist)`);
        } catch (error) {
            console.error('[Accounting Snapshot Job] ❌ Error inserting snapshots:', error);
            throw error;
        }
    } else {
        console.log(`[Accounting Snapshot Job] No new snapshots to create (all already exist)`);
    }
    
    return {
        created: createdCount,
        skipped: skippedCount,
        total: accounts.length
    };
}

/**
 * Generate snapshots for a specific date range (for backfilling)
 */
async function generateSnapshotsForDateRange(startDate, endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const current = new Date(start);
    const results = [];
    
    while (current <= end) {
        const snapshotDate = new Date(current);
        snapshotDate.setHours(23, 59, 59, 999);
        
        // Temporarily override the date calculation
        const originalGenerate = generateBalanceSnapshots;
        // We need to modify the function to accept a date parameter
        // For now, we'll create a wrapper
        
        current.setDate(current.getDate() + 1);
    }
    
    return results;
}

module.exports = { generateBalanceSnapshots, generateSnapshotsForDateRange };




