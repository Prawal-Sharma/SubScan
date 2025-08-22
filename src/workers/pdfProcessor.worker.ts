/// <reference lib="webworker" />

import { Transaction } from '../types';
import { normalizeMerchant } from '../utils/merchantNormalizer';
import { parseStatementDate } from '../utils/dateUtils';

interface WorkerMessage {
  type: 'PROCESS_TEXT' | 'PARSE_TRANSACTIONS' | 'DETECT_BANK';
  data: any;
  id: string;
}

interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
  data: any;
  id: string;
  error?: string;
}

/**
 * Process text in the worker thread
 */
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'PROCESS_TEXT':
        const processedText = processText(data.text);
        postResponse({ type: 'SUCCESS', data: processedText, id });
        break;
        
      case 'PARSE_TRANSACTIONS':
        const transactions = parseTransactions(data.text, data.bankType);
        postResponse({ type: 'SUCCESS', data: transactions, id });
        break;
        
      case 'DETECT_BANK':
        const bankType = detectBankType(data.text);
        postResponse({ type: 'SUCCESS', data: bankType, id });
        break;
        
      default:
        postResponse({ 
          type: 'ERROR', 
          data: null, 
          id, 
          error: `Unknown message type: ${type}` 
        });
    }
  } catch (error) {
    postResponse({ 
      type: 'ERROR', 
      data: null, 
      id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

function postResponse(response: WorkerResponse) {
  self.postMessage(response);
}

// Progress reporting function (can be used for future enhancements)
// function postProgress(progress: number, id: string) {
//   postResponse({ type: 'PROGRESS', data: { progress }, id });
// }

/**
 * Process and clean text
 */
function processText(text: string): string {
  // Remove extra whitespace
  let processed = text.replace(/\s+/g, ' ');
  
  // Fix common OCR issues
  processed = processed.replace(/\bl\s+([A-Z])/g, 'I$1'); // l -> I
  processed = processed.replace(/0([A-Z])/g, 'O$1'); // 0 -> O
  
  // Normalize line endings
  processed = processed.replace(/\r\n/g, '\n');
  
  return processed.trim();
}

/**
 * Detect bank type from text
 */
function detectBankType(text: string): string {
  const textLower = text.toLowerCase();
  
  const bankPatterns = [
    { pattern: /wells\s*fargo/i, type: 'wells-fargo' },
    { pattern: /capital\s*one|venture/i, type: 'capital-one' },
    { pattern: /chase/i, type: 'chase' },
    { pattern: /bank\s*of\s*america|bkofamerica/i, type: 'bank-of-america' },
    { pattern: /discover/i, type: 'discover' },
    { pattern: /citi|citibank/i, type: 'citi' },
    { pattern: /us\s*bank/i, type: 'us-bank' },
    { pattern: /pnc/i, type: 'pnc' }
  ];
  
  for (const { pattern, type } of bankPatterns) {
    if (pattern.test(textLower)) {
      return type;
    }
  }
  
  return 'unknown';
}

/**
 * Parse transactions based on bank type
 */
function parseTransactions(text: string, bankType: string): Partial<Transaction>[] {
  const lines = text.split('\n');
  const transactions: Partial<Transaction>[] = [];
  
  // Generic transaction parsing
  for (const line of lines) {
    const transaction = parseTransactionLine(line, bankType);
    if (transaction) {
      transactions.push(transaction);
    }
  }
  
  return transactions;
}

/**
 * Parse a single transaction line
 */
function parseTransactionLine(line: string, bankType: string): Partial<Transaction> | null {
  const trimmed = line.trim();
  
  // Skip empty or header lines
  if (trimmed.length < 10) return null;
  
  // Look for date pattern
  const dateMatch = trimmed.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/);
  if (!dateMatch) return null;
  
  // Look for amount pattern
  const amountMatch = trimmed.match(/\$?([\d,]+\.\d{2})/);
  if (!amountMatch) return null;
  
  // Extract date
  const dateStr = dateMatch[1];
  const date = parseStatementDate(dateStr);
  if (!date) return null;
  
  // Extract amount
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  
  // Extract description (everything between date and amount)
  let description = trimmed;
  description = description.replace(dateMatch[0], '');
  description = description.replace(amountMatch[0], '');
  description = description.trim();
  
  // Normalize merchant name
  const merchant = extractMerchant(description, bankType);
  const normalizedMerchant = normalizeMerchant(merchant);
  
  return {
    date,
    description,
    merchant,
    normalizedMerchant,
    amount,
    type: 'debit' // Default to debit, can be refined based on context
  };
}

/**
 * Extract merchant name from description
 */
function extractMerchant(description: string, _bankType?: string): string {
  let merchant = description;
  
  // Remove common prefixes based on bank
  const prefixPatterns = [
    /^(POS|WEB PMT|ONLINE PMT|RECURRING PAYMENT|Purchase authorized on \d{2}\/\d{2})/i,
    /^(CHECKCARD|DEBIT CARD|CREDIT CARD)/i,
    /^(ACH|WIRE|TRANSFER)/i
  ];
  
  for (const pattern of prefixPatterns) {
    merchant = merchant.replace(pattern, '').trim();
  }
  
  // Remove trailing reference numbers
  merchant = merchant.replace(/\s+[A-Z0-9]{10,}$/i, '').trim();
  
  // Remove card numbers
  merchant = merchant.replace(/\s+Card\s+\d{4}.*$/i, '').trim();
  
  // Remove location codes (two letter state codes at the end)
  merchant = merchant.replace(/\s+[A-Z]{2}$/i, '').trim();
  
  return merchant;
}

// Export for TypeScript
export {};