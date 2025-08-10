import { Transaction, ParsedStatement, ParserResult } from '../types';
import { parseStatementDate } from '../utils/dateUtils';
import { normalizeMerchant } from '../utils/merchantNormalizer';
import { v4 as uuidv4 } from 'uuid';

export class WellsFargoParser {
  private isWellsFargoStatement(text: string): boolean {
    const textLower = text.toLowerCase();
    return textLower.includes('wells fargo') || 
           textLower.includes('wellsfargo') ||
           textLower.includes('statement period') && textLower.includes('account number');
  }

  private parseYear(text: string): number {
    // Look for year in the statement header
    const yearMatch = text.match(/\b(20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  }
  
  private parseAccountInfo(text: string): { accountName: string; accountNumber?: string } {
    // Extract account name
    let accountName = 'Wells Fargo';
    const accountTypeMatch = text.match(/Wells Fargo ([\w\s]+?)(?:Page|Statement|Account)/i);
    if (accountTypeMatch) {
      accountName = `Wells Fargo ${accountTypeMatch[1].trim()}`;
    }
    
    // Extract account number
    const accountNumberMatch = text.match(/Account number:\s*(\d+)/i);
    const accountNumber = accountNumberMatch ? accountNumberMatch[1] : undefined;
    
    return { accountName, accountNumber };
  }
  
  private parseDateRange(text: string): { startDate: Date | null; endDate: Date | null } {
    // Look for statement period pattern
    const periodMatch = text.match(/Statement period.*?(\w+\s+\d+).*?[-–]\s*(\w+\s+\d+)/i);
    
    if (periodMatch) {
      const year = this.parseYear(text);
      const startDate = parseStatementDate(periodMatch[1], year);
      const endDate = parseStatementDate(periodMatch[2], year);
      return { startDate, endDate };
    }
    
    return { startDate: null, endDate: null };
  }
  
  private extractTransactionLines(text: string): string[] {
    const lines = text.split('\n');
    const transactionLines: string[] = [];
    let inTransactionSection = false;
    
    for (const line of lines) {
      // Start of transaction section
      if (line.includes('Transaction history') || line.includes('Date Check Number Description')) {
        inTransactionSection = true;
        continue;
      }
      
      // End of transaction section
      if (inTransactionSection && (
        line.includes('Totals') ||
        line.includes('Monthly service fee') ||
        line.includes('The Ending Daily Balance')
      )) {
        break;
      }
      
      // Transaction line pattern: starts with date (M/D or MM/DD)
      if (inTransactionSection && /^\d{1,2}\/\d{1,2}\s/.test(line.trim())) {
        transactionLines.push(line);
      }
    }
    
    return transactionLines;
  }
  
  private parseTransactionLine(line: string, year: number): Transaction | null {
    // Wells Fargo format: Date | Check# | Description | Deposits | Withdrawals | Balance
    // Example: "7/1 Recurring Payment authorized on 06/30 Atmos Energy 888-286-6700 TX S465181288659408 Card 7765  30.76"
    
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length < 3) return null;
    
    // Extract date
    const dateMatch = line.match(/^(\d{1,2}\/\d{1,2})/);
    if (!dateMatch) return null;
    
    const date = parseStatementDate(dateMatch[1], year);
    if (!date) return null;
    
    // Remove date from line for further processing
    let remaining = line.substring(dateMatch[0].length).trim();
    
    // Extract amount (look for decimal numbers at the end)
    const amountMatches = remaining.match(/\d+\.\d{2}/g);
    if (!amountMatches || amountMatches.length === 0) return null;
    
    // The actual transaction amount is usually the second-to-last or last decimal
    // (last one might be the balance)
    let amount = 0;
    let isDebit = true;
    
    // Check if there are multiple amount columns
    if (amountMatches.length >= 2) {
      // If there are deposits and withdrawals columns
      const lastTwo = amountMatches.slice(-2);
      
      // Determine which is the transaction amount
      // In Wells Fargo, deposits come before withdrawals
      const possibleDeposit = parseFloat(lastTwo[0]);
      const possibleWithdrawal = parseFloat(lastTwo[1]);
      
      if (remaining.includes('Payment') || remaining.includes('Deposit') || remaining.includes('Credit')) {
        amount = possibleDeposit;
        isDebit = false;
      } else {
        amount = possibleWithdrawal || possibleDeposit;
        isDebit = true;
      }
    } else {
      amount = parseFloat(amountMatches[0]);
      // Determine type from description
      isDebit = !remaining.match(/payment|deposit|credit|refund/i);
    }
    
    // Extract description (everything between date and amounts)
    const description = remaining.replace(/\d+\.\d{2}/g, '').trim();
    
    // Extract merchant from description
    let merchant = description;
    
    // Remove common Wells Fargo prefixes
    merchant = merchant.replace(/^(Recurring Payment authorized on \d{2}\/\d{2}|Purchase authorized on \d{2}\/\d{2})/i, '').trim();
    
    // Remove card numbers and reference codes
    merchant = merchant.replace(/Card \d{4}.*$/i, '').trim();
    merchant = merchant.replace(/[SP]\d{12,}.*$/i, '').trim();
    
    return {
      id: uuidv4(),
      date,
      description,
      merchant,
      normalizedMerchant: normalizeMerchant(merchant),
      amount,
      type: isDebit ? 'debit' : 'credit',
      rawData: line,
    };
  }
  
  parse(text: string): ParserResult {
    try {
      // Validate that this is a Wells Fargo statement
      if (!this.isWellsFargoStatement(text)) {
        return {
          success: false,
          error: 'This does not appear to be a Wells Fargo statement',
        };
      }

      // Extract basic information
      const { accountName, accountNumber } = this.parseAccountInfo(text);
      const { startDate, endDate } = this.parseDateRange(text);
      const year = this.parseYear(text);
      
      // Extract and parse transactions
      const transactionLines = this.extractTransactionLines(text);
      const transactions: Transaction[] = [];
      const parsingErrors: string[] = [];
      
      for (const line of transactionLines) {
        try {
          const transaction = this.parseTransactionLine(line, year);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          parsingErrors.push(`Failed to parse line: ${line}`);
        }
      }
      
      const statement: ParsedStatement = {
        accountName,
        accountNumber,
        institution: 'Wells Fargo',
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