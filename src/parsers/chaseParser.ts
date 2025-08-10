import { Transaction, ParsedStatement, ParserResult } from '../types';
import { normalizeMerchant } from '../utils/merchantNormalizer';
import { v4 as uuidv4 } from 'uuid';

export class ChaseParser {
  private parseYear(text: string): number {
    // Look for year in dates like "July 1, 2022"
    const yearMatch = text.match(/\b(20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  }
  
  private parseAccountInfo(text: string): { accountName: string; accountNumber?: string } {
    let accountName = 'Chase Checking';
    
    // Extract account number
    const accountNumberMatch = text.match(/Account:\s*(\d+)/i);
    let accountNumber = undefined;
    if (accountNumberMatch) {
      accountNumber = accountNumberMatch[1];
    }
    
    return { accountName, accountNumber };
  }
  
  private parseDateRange(text: string): { startDate: Date | null; endDate: Date | null } {
    // Look for date range pattern like "July 1, 2022 through July 31, 2022"
    const rangeMatch = text.match(/(\w+\s+\d+,\s+\d{4})\s+through\s+(\w+\s+\d+,\s+\d{4})/i);
    
    if (rangeMatch) {
      const startDate = new Date(rangeMatch[1]);
      const endDate = new Date(rangeMatch[2]);
      return { startDate, endDate };
    }
    
    return { startDate: null, endDate: null };
  }
  
  private extractTransactionSections(text: string): {
    deposits: string[];
    checks: string[];
    withdrawals: string[];
  } {
    const lines = text.split('\n');
    const deposits: string[] = [];
    const checks: string[] = [];
    const withdrawals: string[] = [];
    let currentSection = '';
    
    for (const line of lines) {
      // Detect section headers
      if (line.includes('DEPOSITS AND ADDITIONS')) {
        currentSection = 'deposits';
        continue;
      }
      if (line.includes('CHECKS PAID')) {
        currentSection = 'checks';
        continue;
      }
      if (line.includes('OTHER WITHDRAWALS')) {
        currentSection = 'withdrawals';
        continue;
      }
      if (line.includes('DAILY ENDING BALANCE') || line.includes('SERVICE CHARGE')) {
        currentSection = '';
        continue;
      }
      
      // Parse transactions based on current section
      const trimmedLine = line.trim();
      
      // Check if line starts with date pattern MM/DD
      if (/^\d{2}\/\d{2}/.test(trimmedLine)) {
        if (currentSection === 'deposits') {
          deposits.push(trimmedLine);
        } else if (currentSection === 'checks') {
          checks.push(trimmedLine);
        } else if (currentSection === 'withdrawals') {
          withdrawals.push(trimmedLine);
        }
      }
    }
    
    return { deposits, checks, withdrawals };
  }
  
  private parseTransactionLine(line: string, year: number, isDebit: boolean): Transaction | null {
    // Chase format: MM/DD Description Amount
    
    const dateMatch = line.match(/^(\d{2}\/\d{2})/);
    if (!dateMatch) return null;
    
    const dateStr = dateMatch[1];
    let remaining = line.substring(dateStr.length).trim();
    
    // Extract amount (last number with decimal and possible comma)
    const amountMatches = remaining.match(/\$?([\d,]+\.\d{2})/g);
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
    
    // Parse date (MM/DD format - add year)
    const parts = dateStr.split('/');
    const date = new Date(year, parseInt(parts[0]) - 1, parseInt(parts[1]));
    
    if (isNaN(date.getTime())) return null;
    
    // Extract merchant from description
    let merchant = description;
    
    // Clean up common Chase prefixes
    merchant = merchant.replace(/^(Online Payment|Deposit|Check \d+)/i, '').trim();
    merchant = merchant.replace(/\s+XXXXX\s+To\s+/gi, ' To ').trim();
    
    // Extract vendor name from "Online Payment XXXXX To Vendor" format
    const vendorMatch = merchant.match(/To\s+(.+)$/i);
    if (vendorMatch) {
      merchant = vendorMatch[1].trim();
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
      const { deposits, checks, withdrawals } = this.extractTransactionSections(text);
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
      
      // Parse checks
      for (const line of checks) {
        try {
          const transaction = this.parseTransactionLine(line, year, true);
          if (transaction) {
            // Mark as check in description if not already there
            if (!transaction.description.toLowerCase().includes('check')) {
              transaction.description = `Check - ${transaction.description}`;
            }
            transactions.push(transaction);
          }
        } catch (error) {
          parsingErrors.push(`Failed to parse check: ${line}`);
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
        institution: 'Chase',
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