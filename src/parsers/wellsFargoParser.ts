import { Transaction, ParserResult } from '../types';
import { parseStatementDate } from '../utils/dateUtils';
import { normalizeMerchant } from '../utils/merchantNormalizer';
import { createParsedStatement, createTransaction } from './parserUtils';

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
  
  private extractTransactionLinesFallback(text: string): string[] {
    const lines = text.split('\n');
    const transactionLines: string[] = [];
    
    console.log('[WellsFargo Parser] Using fallback method to find transactions...');
    
    // Look for any line that starts with a date and contains a decimal amount
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip header/footer lines
      if (trimmedLine.length < 10 || 
          trimmedLine.startsWith('Page') ||
          trimmedLine.startsWith('Account') ||
          trimmedLine.startsWith('Wells Fargo') ||
          trimmedLine.includes('Statement period')) {
        continue;
      }
      
      // Check if line has date at start AND amount somewhere in it
      const hasDate = /^\d{1,2}[\/\-]\d{1,2}/.test(trimmedLine);
      const hasAmount = /\d{1,3}(?:,\d{3})*\.\d{2}/.test(trimmedLine);
      
      if (hasDate && hasAmount) {
        transactionLines.push(line);
      }
    }
    
    console.log('[WellsFargo Parser] Fallback found', transactionLines.length, 'potential transaction lines');
    return transactionLines;
  }
  
  private extractTransactionLines(text: string): string[] {
    const lines = text.split('\n');
    const transactionLines: string[] = [];
    let inTransactionSection = false;
    
    // Debug logging
    console.log('[WellsFargo Parser] Total lines in PDF:', lines.length);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Multiple patterns for transaction section start
      if (!inTransactionSection && (
        line.includes('Transaction history') ||
        line.includes('Date Check Number Description') ||
        line.includes('Date Description') ||
        line.includes('Transactions') ||
        line.includes('Date Transaction Description') ||
        // Also check if we see a date pattern followed by transaction-like text
        (/^\d{1,2}\/\d{1,2}/.test(trimmedLine) && i > 10) // After header area
      )) {
        inTransactionSection = true;
        console.log('[WellsFargo Parser] Found transaction section at line', i);
        
        // If we matched on a date pattern, include this line
        if (/^\d{1,2}\/\d{1,2}/.test(trimmedLine)) {
          transactionLines.push(line);
        }
        continue;
      }
      
      // End of transaction section - expanded patterns
      if (inTransactionSection && (
        line.includes('Totals') ||
        line.includes('Monthly service fee') ||
        line.includes('The Ending Daily Balance') ||
        line.includes('Daily Balance Summary') ||
        line.includes('Service Fee Summary') ||
        line.includes('Important messages')
      )) {
        console.log('[WellsFargo Parser] End of transactions at line', i);
        break;
      }
      
      // Transaction line patterns - more flexible
      if (inTransactionSection) {
        // Multiple date formats
        if (/^\d{1,2}\/\d{1,2}/.test(trimmedLine) || // M/D or MM/DD
            /^\d{1,2}-\d{1,2}/.test(trimmedLine) || // M-D or MM-DD
            /^\d{1,2}\/\d{1,2}\/\d{2}/.test(trimmedLine)) { // M/D/YY or MM/DD/YY
          transactionLines.push(line);
        }
        // Also try to catch transactions that might be split across lines
        else if (trimmedLine.length > 10 && !trimmedLine.match(/^[A-Z][a-z]+ \d{1,2},? \d{4}/) && // Not a full date
                 !trimmedLine.match(/^Page \d+/) && // Not a page number
                 !trimmedLine.match(/^Account/) && // Not an account header
                 transactionLines.length > 0) { // We've already found some transactions
          // This might be a continuation of the previous transaction
          const lastTransaction = transactionLines[transactionLines.length - 1];
          if (!lastTransaction.includes('  ')) { // If the last line doesn't have multiple spaces, it might be incomplete
            transactionLines[transactionLines.length - 1] = lastTransaction + ' ' + line;
          }
        }
      }
    }
    
    console.log('[WellsFargo Parser] Found', transactionLines.length, 'transaction lines');
    if (transactionLines.length > 0) {
      console.log('[WellsFargo Parser] Sample transaction:', transactionLines[0]);
    }
    
    return transactionLines;
  }
  
  private parseTransactionLine(line: string, year: number, startDate?: Date, endDate?: Date): Transaction | null {
    // Wells Fargo format: Date | Check# | Description | Deposits | Withdrawals | Balance
    // Example: "7/1 Recurring Payment authorized on 06/30 Atmos Energy 888-286-6700 TX S465181288659408 Card 7765  30.76"
    
    const trimmedLine = line.trim();
    
    // Extract date - support multiple formats
    const dateMatch = trimmedLine.match(/^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/);
    if (!dateMatch) {
      console.log('[WellsFargo Parser] No date match for line:', trimmedLine.substring(0, 50));
      return null;
    }
    
    let date = parseStatementDate(dateMatch[1], year);
    if (!date) return null;
    
    // Handle year boundary issues when parsing dates without year
    if (startDate && endDate && !dateMatch[1].includes('/20') && !dateMatch[1].includes('-20')) {
      // If the parsed date is significantly after the end date, it's likely from the previous year
      if (date.getTime() > endDate.getTime() + (30 * 24 * 60 * 60 * 1000)) { // 30 days buffer
        date = new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
      }
      // If the parsed date is significantly before the start date, it might be from the next year
      else if (date.getTime() < startDate.getTime() - (30 * 24 * 60 * 60 * 1000)) { // 30 days buffer
        date = new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
      }
    }
    
    // Remove date from line for further processing
    let remaining = line.substring(dateMatch[0].length).trim();
    
    // Extract amount (look for decimal numbers)
    const amountMatches = remaining.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g);
    if (!amountMatches || amountMatches.length === 0) {
      console.log('[WellsFargo Parser] No amount found in line:', trimmedLine.substring(0, 50));
      return null;
    }
    
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
      const possibleDeposit = parseFloat(lastTwo[0].replace(/,/g, ''));
      const possibleWithdrawal = parseFloat(lastTwo[1].replace(/,/g, ''));
      
      if (remaining.includes('Payment') || remaining.includes('Deposit') || remaining.includes('Credit')) {
        amount = possibleDeposit;
        isDebit = false;
      } else {
        amount = possibleWithdrawal || possibleDeposit;
        isDebit = true;
      }
    } else {
      amount = parseFloat(amountMatches[0].replace(/,/g, ''));
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
    
    return createTransaction(
      date,
      description,
      merchant,
      normalizeMerchant(merchant),
      amount,
      isDebit ? 'debit' : 'credit',
      line
    );
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
      let transactionLines = this.extractTransactionLines(text);
      const transactions: Transaction[] = [];
      const parsingErrors: string[] = [];
      
      // If no transactions found with primary method, try fallback
      if (transactionLines.length === 0) {
        console.log('[WellsFargo Parser] No transactions found with primary method, trying fallback...');
        transactionLines = this.extractTransactionLinesFallback(text);
      }
      
      for (const line of transactionLines) {
        try {
          const transaction = this.parseTransactionLine(line, year, startDate || undefined, endDate || undefined);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          parsingErrors.push(`Failed to parse line: ${line}`);
        }
      }
      
      console.log('[WellsFargo Parser] Parsed', transactions.length, 'transactions successfully');
      
      const statement = createParsedStatement(
        accountName,
        'Wells Fargo',
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