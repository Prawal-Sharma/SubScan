import { Transaction, ParsedStatement, ParserResult } from '../types';
import { normalizeMerchant } from '../utils/merchantNormalizer';
import { v4 as uuidv4 } from 'uuid';

export class DiscoverParser {
  private parseYear(text: string): number {
    // Look for year in dates like "Sep 15, 2022"
    const yearMatch = text.match(/\b(20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  }
  
  private parseAccountInfo(text: string): { accountName: string; accountNumber?: string } {
    let accountName = 'Discover Card';
    
    // Check for specific card type
    if (text.includes('Discover it')) {
      accountName = 'Discover it Card';
    }
    
    // Extract account number (last 4 digits)
    const accountNumberMatch = text.match(/Account\s+number\s+ending\s+in\s+(\d{4})/i);
    let accountNumber = undefined;
    if (accountNumberMatch) {
      accountNumber = `****${accountNumberMatch[1]}`;
    }
    
    return { accountName, accountNumber };
  }
  
  private parseDateRange(text: string): { startDate: Date | null; endDate: Date | null } {
    // Look for date range pattern like "Sep 15, 2022 - Close Date: Oct 26, 2022"
    const rangeMatch = text.match(/Open\s+Date:\s*(\w+\s+\d+,\s+\d{4}).*?Close\s+Date:\s*(\w+\s+\d+,\s+\d{4})/i);
    
    if (rangeMatch) {
      const startDate = new Date(rangeMatch[1]);
      const endDate = new Date(rangeMatch[2]);
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
    let inTransactionsTable = false;
    
    for (const line of lines) {
      // Detect section headers
      if (line.includes('Payments and Credits')) {
        currentSection = 'payments';
        continue;
      }
      if (line.includes('Merchandise') || line.includes('Restaurants') || 
          line.includes('Gasoline') || line.includes('Transactions')) {
        currentSection = 'transactions';
        inTransactionsTable = true;
        continue;
      }
      if (line.includes('Fees') || line.includes('Interest Charged')) {
        currentSection = '';
        inTransactionsTable = false;
        continue;
      }
      
      const trimmedLine = line.trim();
      
      // Parse based on section
      if (currentSection === 'payments') {
        // Payments format: Mon DD Mon DD Description Amount
        if (/^[A-Z][a-z]{2}\s+\d{1,2}/.test(trimmedLine)) {
          payments.push(trimmedLine);
        }
      } else if (currentSection === 'transactions' || inTransactionsTable) {
        // Transaction format: Mon DD Mon DD Description Amount
        if (/^[A-Z][a-z]{2}\s+\d{1,2}/.test(trimmedLine)) {
          transactions.push(trimmedLine);
        }
      }
    }
    
    return { payments, transactions };
  }
  
  private parseTransactionLine(line: string, year: number, isCredit: boolean = false): Transaction | null {
    // Discover format: Mon DD Mon DD Description Amount
    // Example: Sep 21 Sep 21 WAL-MART SC - #0571 GEORGETOWN KY $ 22.37
    
    // Match the date pattern at the beginning
    const dateMatch = line.match(/^([A-Z][a-z]{2}\s+\d{1,2})\s+([A-Z][a-z]{2}\s+\d{1,2})/);
    if (!dateMatch) return null;
    
    const transDate = dateMatch[1]; // Transaction date
    // const postDate = dateMatch[2];  // Post date (kept for future use)
    
    // Use transaction date for our purposes
    let remaining = line.substring(dateMatch[0].length).trim();
    
    // Extract amount (with or without $ sign)
    const amountMatch = remaining.match(/\$?\s*([\d,]+\.\d{2})$/);
    if (!amountMatch) return null;
    
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    
    // Extract description (everything between dates and amount)
    let description = remaining.substring(0, remaining.lastIndexOf(amountMatch[0])).trim();
    
    // Parse date (Mon DD format - add year)
    const monthMap: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const dateParts = transDate.split(/\s+/);
    const month = monthMap[dateParts[0]];
    const day = parseInt(dateParts[1]);
    const date = new Date(year, month, day);
    
    if (isNaN(date.getTime())) return null;
    
    // Extract merchant from description
    let merchant = description;
    
    // Clean up common Discover prefixes
    merchant = merchant.replace(/^(INTERNET PAYMENT|PAYMENT RECEIVED)/i, '').trim();
    merchant = merchant.replace(/\s*-\s*THANK YOU$/i, '').trim();
    
    // Remove location codes at the end (state abbreviations)
    merchant = merchant.replace(/\s+[A-Z]{2}$/, '').trim();
    
    // Extract store number if present
    merchant = merchant.replace(/\s*#\d+/, '').trim();
    
    return {
      id: uuidv4(),
      date,
      description,
      merchant,
      normalizedMerchant: normalizeMerchant(merchant),
      amount: Math.abs(amount),
      type: isCredit ? 'credit' : 'debit',
      rawData: line,
    };
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
          const transaction = this.parseTransactionLine(line, year, true);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          parsingErrors.push(`Failed to parse payment: ${line}`);
        }
      }
      
      // Parse purchases (debits)
      for (const line of purchaseLines) {
        try {
          const transaction = this.parseTransactionLine(line, year, false);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          parsingErrors.push(`Failed to parse transaction: ${line}`);
        }
      }
      
      const statement: ParsedStatement = {
        accountName,
        accountNumber,
        institution: 'Discover',
        startDate: startDate || new Date(),
        endDate: endDate || new Date(),
        transactions,
        parsingErrors: parsingErrors.length > 0 ? parsingErrors : undefined,
      };
      
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