import { Transaction, ParsedStatement, ParserResult } from '../types';
import { normalizeMerchant } from '../utils/merchantNormalizer';
import { v4 as uuidv4 } from 'uuid';

export class BankOfAmericaParser {
  private parseYear(text: string): number {
    // Look for year in dates like "February 1, 2022"
    const yearMatch = text.match(/\b(20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  }
  
  private parseAccountInfo(text: string): { accountName: string; accountNumber?: string } {
    // Extract account name
    let accountName = 'Bank of America';
    const accountTypeMatch = text.match(/Business\s+([\w\s]+?)\s+Checking/i);
    if (accountTypeMatch) {
      accountName = `Bank of America ${accountTypeMatch[1].trim()} Checking`;
    }
    
    // Extract account number
    const accountNumberMatch = text.match(/Account\s+number:\s*(\d+\s*\d+\s*\d+)/i);
    let accountNumber = undefined;
    if (accountNumberMatch) {
      accountNumber = accountNumberMatch[1].replace(/\s+/g, '');
    }
    
    return { accountName, accountNumber };
  }
  
  private parseDateRange(text: string): { startDate: Date | null; endDate: Date | null } {
    // Look for date range pattern like "February 1, 2022 to February 28, 2022"
    const rangeMatch = text.match(/(\w+\s+\d+,\s+\d{4})\s+to\s+(\w+\s+\d+,\s+\d{4})/i);
    
    if (rangeMatch) {
      const startDate = new Date(rangeMatch[1]);
      const endDate = new Date(rangeMatch[2]);
      return { startDate, endDate };
    }
    
    return { startDate: null, endDate: null };
  }
  
  private extractTransactionSections(text: string): {
    deposits: string[];
    withdrawals: string[];
  } {
    const lines = text.split('\n');
    const deposits: string[] = [];
    const withdrawals: string[] = [];
    let currentSection = '';
    
    for (const line of lines) {
      // Detect section headers
      if (line.includes('Deposits and other credits')) {
        currentSection = 'deposits';
        continue;
      }
      if (line.includes('Withdrawals and other debits')) {
        currentSection = 'withdrawals';
        continue;
      }
      if (line.includes('Service fees') || line.includes('Daily Ending Balance')) {
        currentSection = '';
        continue;
      }
      
      // Parse transactions based on current section
      const trimmedLine = line.trim();
      
      // Check if line starts with date pattern MM/DD/YY or MM/DD
      if (/^\d{2}\/\d{2}/.test(trimmedLine)) {
        if (currentSection === 'deposits') {
          deposits.push(trimmedLine);
        } else if (currentSection === 'withdrawals') {
          withdrawals.push(trimmedLine);
        }
      }
    }
    
    return { deposits, withdrawals };
  }
  
  private parseTransactionLine(line: string, year: number, isDebit: boolean): Transaction | null {
    // BofA format: MM/DD/YY Description Amount
    // or: MM/DD Description Amount
    
    const dateMatch = line.match(/^(\d{2}\/\d{2}(?:\/\d{2})?)/);
    if (!dateMatch) return null;
    
    const dateStr = dateMatch[1];
    let remaining = line.substring(dateStr.length).trim();
    
    // Extract amount (last number with decimal)
    const amountMatches = remaining.match(/-?\$?([\d,]+\.\d{2})/g);
    if (!amountMatches || amountMatches.length === 0) return null;
    
    // Get the last amount match
    const amountStr = amountMatches[amountMatches.length - 1];
    const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
    
    // Extract description (everything between date and amount)
    let description = remaining;
    for (const match of amountMatches) {
      description = description.replace(match, '');
    }
    description = description.trim();
    
    // Parse date
    let date: Date | null = null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 2) {
        // MM/DD format - add year
        date = new Date(year, parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else if (parts.length === 3) {
        // MM/DD/YY format
        const fullYear = parseInt(parts[2]) < 50 ? 2000 + parseInt(parts[2]) : 1900 + parseInt(parts[2]);
        date = new Date(fullYear, parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
    }
    
    if (!date || isNaN(date.getTime())) return null;
    
    // Extract merchant from description
    let merchant = description;
    
    // Clean up common Bank of America prefixes
    merchant = merchant.replace(/^(BKOFAMERICA ATM|Online Payment|Zelle Transfer|CHECKCARD)/i, '').trim();
    merchant = merchant.replace(/\s+Conf#\s*\w+/gi, '').trim();
    merchant = merchant.replace(/\s+ID:\w+/gi, '').trim();
    merchant = merchant.replace(/\s+INDN:[\w\s]+/gi, '').trim();
    merchant = merchant.replace(/\s+CO ID:\d+/gi, '').trim();
    merchant = merchant.replace(/\s+\d{2}\/\d{2}/g, '').trim(); // Remove extra dates
    
    // Extract location if present
    const locationMatch = merchant.match(/\s+([A-Z]{2})$/);
    if (locationMatch) {
      merchant = merchant.substring(0, merchant.length - locationMatch[0].length).trim();
    }
    
    return {
      id: uuidv4(),
      date,
      description,
      merchant,
      normalizedMerchant: normalizeMerchant(merchant),
      amount: Math.abs(amount),
      type: isDebit ? 'debit' : 'credit',
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
      const { deposits, withdrawals } = this.extractTransactionSections(text);
      const transactions: Transaction[] = [];
      const parsingErrors: string[] = [];
      
      // Parse deposits
      for (const line of deposits) {
        try {
          const transaction = this.parseTransactionLine(line, year, false);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          parsingErrors.push(`Failed to parse deposit: ${line}`);
        }
      }
      
      // Parse withdrawals
      for (const line of withdrawals) {
        try {
          const transaction = this.parseTransactionLine(line, year, true);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          parsingErrors.push(`Failed to parse withdrawal: ${line}`);
        }
      }
      
      const statement: ParsedStatement = {
        accountName,
        accountNumber,
        institution: 'Bank of America',
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