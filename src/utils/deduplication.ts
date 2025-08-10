import { Transaction } from '../types';
import crypto from 'crypto-js';

/**
 * Generate a hash for a transaction to identify duplicates
 * Now includes full date to prevent false duplicates across different months
 */
export function generateTransactionHash(transaction: Transaction): string {
  // Create a unique identifier based on key transaction properties
  // Include full date to distinguish same-day-of-month transactions across different months
  const hashInput = [
    transaction.date.toISOString().split('T')[0], // Full date YYYY-MM-DD
    transaction.normalizedMerchant,
    transaction.amount.toFixed(2),
    transaction.type,
    transaction.accountName || '',
    // Add description hash for additional uniqueness (first 20 chars)
    transaction.description ? transaction.description.substring(0, 20) : ''
  ].join('|');
  
  return crypto.SHA256(hashInput).toString();
}

/**
 * Deduplicate transactions across multiple statements
 */
export function deduplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Map<string, Transaction>();
  const duplicates: Transaction[] = [];
  
  for (const transaction of transactions) {
    const hash = transaction.hash || generateTransactionHash(transaction);
    
    if (seen.has(hash)) {
      // Keep the transaction with more details or from the newer statement
      const existing = seen.get(hash)!;
      if (shouldReplaceTransaction(existing, transaction)) {
        seen.set(hash, { ...transaction, hash });
      }
      duplicates.push(transaction);
    } else {
      seen.set(hash, { ...transaction, hash });
    }
  }
  
  if (duplicates.length > 0) {
    console.info(`Removed ${duplicates.length} duplicate transactions`);
  }
  
  return Array.from(seen.values());
}

/**
 * Determine if a new transaction should replace an existing one
 */
function shouldReplaceTransaction(existing: Transaction, newTransaction: Transaction): boolean {
  // Prefer transactions with more complete data
  const existingCompleteness = calculateCompleteness(existing);
  const newCompleteness = calculateCompleteness(newTransaction);
  
  if (newCompleteness > existingCompleteness) {
    return true;
  }
  
  // If completeness is the same, prefer newer upload
  if (newCompleteness === existingCompleteness && newTransaction.statementId > existing.statementId) {
    return true;
  }
  
  return false;
}

/**
 * Calculate how complete a transaction's data is
 */
function calculateCompleteness(transaction: Transaction): number {
  let score = 0;
  
  if (transaction.description) score += 1;
  if (transaction.merchant) score += 1;
  if (transaction.category) score += 2;
  if (transaction.balance !== undefined) score += 1;
  if (transaction.rawData) score += 1;
  
  return score;
}

/**
 * Group transactions by account and period for better organization
 */
export function groupTransactionsByAccountAndPeriod(
  transactions: Transaction[]
): Map<string, Map<string, Transaction[]>> {
  const grouped = new Map<string, Map<string, Transaction[]>>();
  
  for (const transaction of transactions) {
    const accountKey = transaction.accountName || 'Unknown Account';
    const periodKey = transaction.date.toISOString().substring(0, 7); // YYYY-MM
    
    if (!grouped.has(accountKey)) {
      grouped.set(accountKey, new Map());
    }
    
    const accountGroup = grouped.get(accountKey)!;
    if (!accountGroup.has(periodKey)) {
      accountGroup.set(periodKey, []);
    }
    
    accountGroup.get(periodKey)!.push(transaction);
  }
  
  return grouped;
}

/**
 * Check if two date ranges overlap
 */
export function datesOverlap(
  start1: Date, end1: Date,
  start2: Date, end2: Date
): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * Merge overlapping statements from the same account
 */
export function mergeOverlappingStatements(
  statements: import('../types').ParsedStatement[]
): import('../types').ParsedStatement[] {
  const grouped = new Map<string, import('../types').ParsedStatement[]>();
  
  // Group by account
  for (const statement of statements) {
    const key = `${statement.institution}-${statement.accountNumber || statement.accountName}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(statement);
  }
  
  const merged: import('../types').ParsedStatement[] = [];
  
  // Process each account group
  for (const [, accountStatements] of grouped) {
    // Sort by start date
    accountStatements.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    const mergedForAccount: import('../types').ParsedStatement[] = [];
    
    for (const statement of accountStatements) {
      const overlapping = mergedForAccount.find(s =>
        datesOverlap(s.startDate, s.endDate, statement.startDate, statement.endDate)
      );
      
      if (overlapping) {
        // Merge statements
        overlapping.startDate = new Date(Math.min(overlapping.startDate.getTime(), statement.startDate.getTime()));
        overlapping.endDate = new Date(Math.max(overlapping.endDate.getTime(), statement.endDate.getTime()));
        
        // Deduplicate and merge transactions
        const allTransactions = [...overlapping.transactions, ...statement.transactions];
        overlapping.transactions = deduplicateTransactions(allTransactions);
        
        // Combine parsing errors
        if (statement.parsingErrors && statement.parsingErrors.length > 0) {
          overlapping.parsingErrors = [
            ...(overlapping.parsingErrors || []),
            ...statement.parsingErrors
          ];
        }
      } else {
        mergedForAccount.push(statement);
      }
    }
    
    merged.push(...mergedForAccount);
  }
  
  return merged;
}