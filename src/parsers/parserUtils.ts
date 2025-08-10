import { ParsedStatement, Transaction } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a ParsedStatement with default values for new fields
 * This is used by parsers to ensure backward compatibility
 */
export function createParsedStatement(
  accountName: string,
  institution: string,
  startDate: Date,
  endDate: Date,
  transactions: Transaction[],
  options?: {
    accountNumber?: string;
    parsingErrors?: string[];
  }
): ParsedStatement {
  const statementId = uuidv4();
  
  // Add statementId to all transactions
  const transactionsWithStatementId = transactions.map(txn => ({
    ...txn,
    statementId: statementId,
    // Add other optional fields with defaults
    hash: undefined,
    sourceFile: undefined
  }));
  
  return {
    id: statementId,
    accountName,
    accountNumber: options?.accountNumber,
    institution,
    startDate,
    endDate,
    transactions: transactionsWithStatementId,
    parsingErrors: options?.parsingErrors,
    // These will be set by the PDFProcessor
    sourceFile: '',
    uploadedAt: new Date(),
    statementPeriod: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
  };
}

/**
 * Create a Transaction with default values for new fields
 */
export function createTransaction(
  date: Date,
  description: string,
  merchant: string,
  normalizedMerchant: string,
  amount: number,
  type: 'debit' | 'credit',
  rawData: string
): Transaction {
  return {
    id: uuidv4(),
    date,
    description,
    merchant,
    normalizedMerchant,
    amount,
    type,
    rawData,
    // Required new fields with defaults
    statementId: '', // Will be set by createParsedStatement
    // Optional new fields
    sourceFile: undefined,
    hash: undefined
  };
}