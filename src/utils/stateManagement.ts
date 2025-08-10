import { ParsedStatement, Transaction, RecurringCharge } from '../types';
import { deduplicateTransactions, mergeOverlappingStatements } from './deduplication';
import { v4 as uuidv4 } from 'uuid';

export interface AppState {
  processedStatements: ParsedStatement[];
  allTransactions: Transaction[];
  recurringCharges: RecurringCharge[];
  // New fields for better tracking
  statementsByBank: Map<string, ParsedStatement[]>;
  transactionsByAccount: Map<string, Transaction[]>;
  processingHistory: ProcessingHistoryEntry[];
}

export interface ProcessingHistoryEntry {
  id: string;
  filename: string;
  processedAt: Date;
  success: boolean;
  transactionCount: number;
  bank: string;
  accountName: string;
  period: string;
  error?: string;
}

/**
 * Initialize empty app state
 */
export function createInitialState(): AppState {
  return {
    processedStatements: [],
    allTransactions: [],
    recurringCharges: [],
    statementsByBank: new Map(),
    transactionsByAccount: new Map(),
    processingHistory: []
  };
}

/**
 * Add new statements to the state with proper deduplication and merging
 */
export function addStatementsToState(
  currentState: AppState,
  newStatements: ParsedStatement[]
): AppState {
  // Assign unique IDs to new statements if not present
  const statementsWithIds = newStatements.map(stmt => ({
    ...stmt,
    id: stmt.id || uuidv4(),
    uploadedAt: stmt.uploadedAt || new Date(),
    statementPeriod: stmt.statementPeriod || 
      `${stmt.startDate.getFullYear()}-${String(stmt.startDate.getMonth() + 1).padStart(2, '0')}`
  }));
  
  // Assign statement IDs to transactions
  for (const statement of statementsWithIds) {
    statement.transactions = statement.transactions.map(txn => ({
      ...txn,
      statementId: statement.id,
      sourceFile: statement.sourceFile
    }));
  }
  
  // Combine all statements and merge overlapping ones
  const allStatements = [...currentState.processedStatements, ...statementsWithIds];
  const mergedStatements = mergeOverlappingStatements(allStatements);
  
  // Extract all transactions and deduplicate
  const allTransactions: Transaction[] = [];
  for (const statement of mergedStatements) {
    allTransactions.push(...statement.transactions);
  }
  const deduplicatedTransactions = deduplicateTransactions(allTransactions);
  
  // Group statements by bank
  const statementsByBank = new Map<string, ParsedStatement[]>();
  for (const statement of mergedStatements) {
    const bankKey = statement.institution;
    if (!statementsByBank.has(bankKey)) {
      statementsByBank.set(bankKey, []);
    }
    statementsByBank.get(bankKey)!.push(statement);
  }
  
  // Group transactions by account
  const transactionsByAccount = new Map<string, Transaction[]>();
  for (const transaction of deduplicatedTransactions) {
    const accountKey = transaction.accountName || 'Unknown';
    if (!transactionsByAccount.has(accountKey)) {
      transactionsByAccount.set(accountKey, []);
    }
    transactionsByAccount.get(accountKey)!.push(transaction);
  }
  
  // Update processing history
  const newHistoryEntries = statementsWithIds.map(stmt => ({
    id: uuidv4(),
    filename: stmt.sourceFile,
    processedAt: stmt.uploadedAt,
    success: true,
    transactionCount: stmt.transactions.length,
    bank: stmt.institution,
    accountName: stmt.accountName,
    period: stmt.statementPeriod,
    error: stmt.parsingErrors && stmt.parsingErrors.length > 0 
      ? stmt.parsingErrors.join('; ') 
      : undefined
  }));
  
  return {
    ...currentState,
    processedStatements: mergedStatements,
    allTransactions: deduplicatedTransactions,
    statementsByBank,
    transactionsByAccount,
    processingHistory: [...currentState.processingHistory, ...newHistoryEntries]
  };
}

/**
 * Add a processing error to the history
 */
export function addProcessingError(
  currentState: AppState,
  filename: string,
  error: string
): AppState {
  const errorEntry: ProcessingHistoryEntry = {
    id: uuidv4(),
    filename,
    processedAt: new Date(),
    success: false,
    transactionCount: 0,
    bank: 'Unknown',
    accountName: 'Unknown',
    period: 'Unknown',
    error
  };
  
  return {
    ...currentState,
    processingHistory: [...currentState.processingHistory, errorEntry]
  };
}

/**
 * Get summary statistics for the current state
 */
export function getStateSummary(state: AppState) {
  const uniqueBanks = Array.from(state.statementsByBank.keys());
  const uniqueAccounts = Array.from(state.transactionsByAccount.keys());
  
  const dateRange = state.allTransactions.reduce((range, txn) => {
    if (!range.min || txn.date < range.min) range.min = txn.date;
    if (!range.max || txn.date > range.max) range.max = txn.date;
    return range;
  }, { min: null as Date | null, max: null as Date | null });
  
  const totalAmount = state.allTransactions
    .filter(txn => txn.type === 'debit')
    .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
  
  const duplicatesRemoved = state.processingHistory
    .filter(entry => entry.success)
    .reduce((sum, entry) => sum + entry.transactionCount, 0) - state.allTransactions.length;
  
  return {
    statementCount: state.processedStatements.length,
    transactionCount: state.allTransactions.length,
    recurringChargeCount: state.recurringCharges.length,
    uniqueBanks: uniqueBanks.length,
    uniqueAccounts: uniqueAccounts.length,
    dateRange,
    totalAmount,
    duplicatesRemoved: Math.max(0, duplicatesRemoved),
    processingErrors: state.processingHistory.filter(e => !e.success).length
  };
}