export interface Transaction {
  id: string;
  date: Date;
  description: string;
  merchant: string;
  normalizedMerchant: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
  accountName?: string;
  balance?: number;
  rawData?: string;
  // New fields for better tracking
  statementId: string; // Links to ParsedStatement
  sourceFile?: string; // Original filename
  hash?: string; // For deduplication
}

export interface RecurringCharge {
  id: string;
  merchant: string;
  normalizedMerchant: string;
  transactions: Transaction[];
  pattern: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'irregular';
  averageAmount: number;
  amountVariance: number;
  nextDueDate?: Date;
  confidence: number; // 0-100
  intervalDays: number;
  isActive: boolean;
}

export interface ParsedStatement {
  id: string; // Unique identifier for the statement
  accountName: string;
  accountNumber?: string;
  institution: string;
  startDate: Date;
  endDate: Date;
  transactions: Transaction[];
  parsingErrors?: string[];
  sourceFile: string; // Original filename
  uploadedAt: Date; // When the file was processed
  statementPeriod: string; // e.g., "2024-01" for easy grouping
}

export interface ParserResult {
  success: boolean;
  data?: ParsedStatement;
  error?: string;
}

export type BankType = 'wells-fargo' | 'capital-one' | 'chase' | 'bank-of-america' | 'discover' | 'unknown';

export interface PDFParseOptions {
  bankType?: BankType;
  startPage?: number;
  endPage?: number;
  ocr?: boolean;
}