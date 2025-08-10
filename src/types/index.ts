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
}

export interface RecurringCharge {
  id: string;
  merchant: string;
  normalizedMerchant: string;
  transactions: Transaction[];
  pattern: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'irregular';
  averageAmount: number;
  amountVariance: number;
  nextDueDate?: Date;
  confidence: number; // 0-100
  intervalDays: number;
  isActive: boolean;
}

export interface ParsedStatement {
  accountName: string;
  accountNumber?: string;
  institution: string;
  startDate: Date;
  endDate: Date;
  transactions: Transaction[];
  parsingErrors?: string[];
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