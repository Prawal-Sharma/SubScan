import { Transaction, ParserResult } from '../types';
import { normalizeMerchant } from '../utils/merchantNormalizer';
import { createParsedStatement, createTransaction } from './parserUtils';

export class CapitalOneParser {
  private parseYear(text: string): number {
    // Look for year in dates like "October 1, 2022"
    const yearMatch = text.match(/\b(20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  }
  
  private parseAccountInfo(text: string): { accountName: string; accountNumber?: string } {
    let accountName = 'Capital One';
    
    // Check for specific card type
    if (text.includes('Venture') || text.includes('VentureOne')) {
      accountName = 'Capital One Venture';
    } else if (text.includes('Savor')) {
      accountName = 'Capital One Savor';
    } else if (text.includes('Quicksilver')) {
      accountName = 'Capital One Quicksilver';
    }
    
    // Extract account number (last 4 digits)
    const accountNumberMatch = text.match(/Account\s+ending\s+in\s+(\d{4})/i);
    let accountNumber = undefined;
    if (accountNumberMatch) {
      accountNumber = `****${accountNumberMatch[1]}`;
    }
    
    return { accountName, accountNumber };
  }
  
  private parseDateRange(text: string): { startDate: Date | null; endDate: Date | null } {
    // Look for date range pattern like "October 1 - October 31, 2022"
    const rangeMatch = text.match(/(\w+\s+\d+)\s*[-–]\s*(\w+\s+\d+),?\s*(\d{4})/i);
    
    if (rangeMatch) {
      const year = parseInt(rangeMatch[3]);
      const startDate = new Date(`${rangeMatch[1]}, ${year}`);
      const endDate = new Date(`${rangeMatch[2]}, ${year}`);
      return { startDate, endDate };
    }
    
    return { startDate: null, endDate: null };
  }
  
  private extractTransactionSections(text: string): {
    payments: string[];
    transactions: string[];
  } {
    const lines = text.split('\n');
    const payments: string[] = [];
    const transactions: string[] = [];
    let currentSection = '';
    let inTransactionTable = false;
    
    for (const line of lines) {
      // Detect section headers
      if (line.includes('Payments') || line.includes('Credits')) {
        currentSection = 'payments';
        continue;
      }
      if (line.includes('Transactions') || line.includes('Purchases')) {
        currentSection = 'transactions';
        inTransactionTable = true;
        continue;
      }
      if (line.includes('Interest Charges') || line.includes('Summary of Account Activity')) {
        currentSection = '';
        inTransactionTable = false;
        continue;
      }
      
      const trimmedLine = line.trim();
      
      // Parse based on section
      if (currentSection === 'payments') {
        // Payments format: Oct DD Description Amount
        if (/^[A-Z][a-z]{2}\s+\d{1,2}/.test(trimmedLine)) {
          payments.push(trimmedLine);
        }
      } else if (currentSection === 'transactions' || inTransactionTable) {
        // Transaction format: Oct DD Description Amount
        if (/^[A-Z][a-z]{2}\s+\d{1,2}/.test(trimmedLine)) {
          transactions.push(trimmedLine);
        }
      }
    }
    
    return { payments, transactions };
  }
  
  private parseTransactionLine(line: string, year: number, isCredit: boolean = false, startDate?: Date, endDate?: Date): Transaction | null {
    // Capital One format: Oct DD Description Amount
    // Example: Oct 15 NETFLIX.COM LOS GATOS CA 19.99
    
    // Match the date pattern at the beginning
    const dateMatch = line.match(/^([A-Z][a-z]{2})\s+(\d{1,2})/);
    if (!dateMatch) return null;
    
    const monthStr = dateMatch[1];
    const day = parseInt(dateMatch[2]);
    
    // Extract the rest after the date
    const remaining = line.substring(dateMatch[0].length).trim();
    
    // Extract amount (last number with decimal)
    const amountMatch = remaining.match(/\$?\s*([\d,]+\.\d{2})$/);
    if (!amountMatch) return null;
    
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    
    // Extract description (everything between date and amount)
    const description = remaining.substring(0, remaining.lastIndexOf(amountMatch[0])).trim();
    
    // Parse date (Oct DD format - add year)
    const monthMap: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const month = monthMap[monthStr];
    let date = new Date(year, month, day);
    
    if (isNaN(date.getTime())) return null;
    
    // Handle year boundary issues when parsing dates without year
    if (startDate && endDate) {
      // If the parsed date is significantly after the end date, it's likely from the previous year
      if (date.getTime() > endDate.getTime() + (30 * 24 * 60 * 60 * 1000)) { // 30 days buffer
        date = new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
      }
      // If the parsed date is significantly before the start date, it might be from the next year
      else if (date.getTime() < startDate.getTime() - (30 * 24 * 60 * 60 * 1000)) { // 30 days buffer
        date = new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
      }
    }
    
    // Extract merchant from description
    let merchant = description;
    
    // Clean up common Capital One prefixes
    merchant = merchant.replace(/^(PAYMENT|ONLINE PAYMENT)/i, '').trim();
    merchant = merchant.replace(/\s*-\s*THANK YOU$/i, '').trim();
    
    // Remove location information (city and state)
    merchant = merchant.replace(/\s+[A-Z]{2}\s*\d{5}$/, '').trim(); // Remove state and zip
    merchant = merchant.replace(/\s+[A-Z]{2}$/, '').trim(); // Remove just state
    
    // Remove transaction IDs and reference numbers
    merchant = merchant.replace(/\s+#\d+/, '').trim();
    merchant = merchant.replace(/\s+REF\s*:\s*\w+/i, '').trim();
    
    return createTransaction(
      date,
      description,
      merchant,
      normalizeMerchant(merchant),
      Math.abs(amount),
      isCredit ? 'credit' : 'debit',
      line
    );
  }
  
  parse(text: string): ParserResult {
    try {
      // Extract basic information
      const { accountName, accountNumber } = this.parseAccountInfo(text);
      const { startDate, endDate } = this.parseDateRange(text);
      const year = this.parseYear(text);
      
      // Extract transactions
      const { payments, transactions: purchaseLines } = this.extractTransactionSections(text);
      const transactions: Transaction[] = [];
      const parsingErrors: string[] = [];
      
      // Parse payments (credits)
      for (const line of payments) {
        try {
          const transaction = this.parseTransactionLine(line, year, true, startDate || undefined, endDate || undefined);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch {
          parsingErrors.push(`Failed to parse payment: ${line}`);
        }
      }
      
      // Parse purchases (debits)
      for (const line of purchaseLines) {
        try {
          const transaction = this.parseTransactionLine(line, year, false, startDate || undefined, endDate || undefined);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch {
          parsingErrors.push(`Failed to parse transaction: ${line}`);
        }
      }
      
      const statement = createParsedStatement(
        accountName,
        'Capital One',
        startDate || new Date(),
        endDate || new Date(),
        transactions,
        {
          accountNumber,
          parsingErrors: parsingErrors.length > 0 ? parsingErrors : undefined
        }
      );
      
      return {
        success: true,
        data: statement,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
      };
    }
  }
}