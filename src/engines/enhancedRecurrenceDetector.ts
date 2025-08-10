import { Transaction, RecurringCharge } from '../types';
import { areMerchantsSimilar } from '../utils/merchantNormalizer';
import { differenceInDays, addDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced recurrence detector with adaptive thresholds and merchant awareness
 */
export class EnhancedRecurrenceDetector {
  // Merchant categories with different variance tolerances
  private merchantCategories = {
    utilities: {
      patterns: ['ELECTRIC', 'GAS', 'WATER', 'POWER', 'UTILITY', 'ENERGY'],
      amountVariance: 0.5, // 50% variance allowed for usage-based
      minTransactions: 2
    },
    streaming: {
      patterns: ['NETFLIX', 'SPOTIFY', 'HULU', 'DISNEY', 'APPLE MUSIC', 'YOUTUBE', 'HBO', 'PARAMOUNT', 'PEACOCK'],
      amountVariance: 0.05, // 5% variance for fixed subscriptions
      minTransactions: 2
    },
    telecom: {
      patterns: ['VERIZON', 'ATT', 'T-MOBILE', 'SPRINT', 'COMCAST', 'SPECTRUM', 'XFINITY'],
      amountVariance: 0.3, // 30% for usage-based plans
      minTransactions: 2
    },
    gym: {
      patterns: ['GYM', 'FITNESS', 'YOGA', 'CROSSFIT', 'PILATES', 'PLANET FITNESS', 'EQUINOX'],
      amountVariance: 0.1, // 10% for membership fees
      minTransactions: 2
    },
    software: {
      patterns: ['ADOBE', 'MICROSOFT', 'DROPBOX', 'GOOGLE STORAGE', 'ICLOUD', 'AWS', 'GITHUB'],
      amountVariance: 0.2, // 20% for tiered plans
      minTransactions: 2
    },
    insurance: {
      patterns: ['INSURANCE', 'GEICO', 'STATE FARM', 'PROGRESSIVE', 'ALLSTATE'],
      amountVariance: 0.15, // 15% for policy changes
      minTransactions: 2
    }
  };

  // Adaptive interval detection with fuzzy matching
  private patternThresholds = {
    weekly: { min: 5, max: 9, expected: 7, tolerance: 0.2 },
    biweekly: { min: 12, max: 16, expected: 14, tolerance: 0.15 },
    monthly: { 
      min: 26, // Accounts for February
      max: 35, // Accounts for month-end variations
      expected: 30, 
      tolerance: 0.25 // Higher tolerance for monthly
    },
    quarterly: { min: 85, max: 95, expected: 90, tolerance: 0.15 },
    semiannual: { min: 175, max: 190, expected: 183, tolerance: 0.1 },
    annual: { min: 355, max: 375, expected: 365, tolerance: 0.1 }
  };

  detectRecurringCharges(transactions: Transaction[]): RecurringCharge[] {
    // Filter out refunds, reversals, and transfers
    const cleanTransactions = this.filterTransactions(transactions);
    
    // Group by merchant with smart clustering
    const merchantGroups = this.groupByMerchantSmart(cleanTransactions);
    
    // Analyze each group
    const recurringCharges: RecurringCharge[] = [];
    
    for (const group of merchantGroups) {
      const category = this.detectMerchantCategory(group[0].normalizedMerchant);
      const minTxns = category?.minTransactions || 2;
      
      if (group.length < minTxns) continue;
      
      const charge = this.analyzeRecurrence(group, category);
      if (charge && charge.confidence >= 60) { // Lower threshold but still meaningful
        recurringCharges.push(charge);
      }
    }
    
    return this.rankAndSort(recurringCharges);
  }

  private filterTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.filter(txn => {
      const desc = txn.description.toLowerCase();
      const merchant = txn.normalizedMerchant.toLowerCase();
      
      // Filter out common non-subscription patterns
      const excludePatterns = [
        'refund', 'credit', 'reversal', 'return', 'adjustment',
        'transfer', 'payment thank you', 'cash back', 'reward',
        'fee refund', 'interest', 'atm', 'deposit', 'check'
      ];
      
      return !excludePatterns.some(pattern => 
        desc.includes(pattern) || merchant.includes(pattern)
      );
    });
  }

  private detectMerchantCategory(merchant: string) {
    const upperMerchant = merchant.toUpperCase();
    
    for (const [category, config] of Object.entries(this.merchantCategories)) {
      if (config.patterns.some(pattern => upperMerchant.includes(pattern))) {
        return { name: category, ...config };
      }
    }
    
    return null;
  }

  private groupByMerchantSmart(transactions: Transaction[]): Transaction[][] {
    const groups: Transaction[][] = [];
    const processed = new Set<string>();
    
    for (const transaction of transactions) {
      if (processed.has(transaction.id)) continue;
      
      const group: Transaction[] = [transaction];
      processed.add(transaction.id);
      
      const category = this.detectMerchantCategory(transaction.normalizedMerchant);
      const amountVariance = category?.amountVariance || 0.2;
      
      // Find similar transactions with category-aware variance
      for (const other of transactions) {
        if (processed.has(other.id)) continue;
        
        if (areMerchantsSimilar(
          transaction.normalizedMerchant,
          other.normalizedMerchant,
          0.8
        )) {
          // Check amount similarity based on category
          const amountRatio = Math.min(transaction.amount, other.amount) / 
                             Math.max(transaction.amount, other.amount);
          
          if (amountRatio >= (1 - amountVariance)) {
            group.push(other);
            processed.add(other.id);
          }
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }

  private analyzeRecurrence(
    transactions: Transaction[], 
    category?: any
  ): RecurringCharge | null {
    // Sort by date
    const sorted = [...transactions].sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );
    
    // Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(differenceInDays(sorted[i].date, sorted[i - 1].date));
    }
    
    if (intervals.length === 0) return null;
    
    // Detect pattern with adaptive thresholds
    const pattern = this.detectAdaptivePattern(intervals);
    
    // Calculate amount statistics
    const amounts = sorted.map(t => t.amount);
    const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const amountVariance = this.calculateVariance(amounts, avgAmount);
    
    // Calculate confidence with category awareness
    const confidence = this.calculateConfidence(
      intervals, 
      pattern, 
      amountVariance,
      category
    );
    
    // Predict next occurrence
    const lastDate = sorted[sorted.length - 1].date;
    const nextDueDate = addDays(lastDate, pattern.intervalDays);
    
    // Check if active (with pattern-aware tolerance)
    const daysSinceLast = differenceInDays(new Date(), lastDate);
    const isActive = daysSinceLast <= pattern.intervalDays * 1.5;
    
    return {
      id: uuidv4(),
      merchant: sorted[0].merchant,
      normalizedMerchant: sorted[0].normalizedMerchant,
      transactions: sorted,
      pattern: pattern.type as any,
      averageAmount: Math.round(avgAmount * 100) / 100,
      amountVariance,
      nextDueDate: isActive ? nextDueDate : undefined,
      confidence,
      intervalDays: pattern.intervalDays,
      isActive
    };
  }

  private detectAdaptivePattern(intervals: number[]) {
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    
    // Check each pattern type
    for (const [type, threshold] of Object.entries(this.patternThresholds)) {
      if (avgInterval >= threshold.min && avgInterval <= threshold.max) {
        // Check if intervals are consistent enough
        const consistent = intervals.every(interval => 
          interval >= threshold.min && interval <= threshold.max
        );
        
        return {
          type,
          intervalDays: Math.round(avgInterval),
          expected: threshold.expected,
          consistent
        };
      }
    }
    
    // Default to irregular but still track interval
    return {
      type: 'irregular',
      intervalDays: Math.round(avgInterval),
      expected: avgInterval,
      consistent: false
    };
  }

  private calculateConfidence(
    intervals: number[],
    pattern: any,
    amountVariance: number,
    category?: any
  ): number {
    let confidence = 100;
    
    // Penalize for interval inconsistency
    if (intervals.length > 0) {
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const intervalVariance = this.calculateVariance(intervals, avgInterval);
      confidence -= intervalVariance * 100; // Reduce confidence based on variance
    }
    
    // Penalize for amount variance (category-aware)
    const expectedVariance = category?.amountVariance || 0.2;
    if (amountVariance > expectedVariance) {
      confidence -= (amountVariance - expectedVariance) * 50;
    }
    
    // Boost confidence for more transactions
    confidence += Math.min(20, intervals.length * 2);
    
    // Boost for known patterns
    if (pattern.type !== 'irregular') {
      confidence += 10;
    }
    
    // Cap between 0 and 100
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  private calculateVariance(values: number[], average: number): number {
    if (values.length === 0 || average === 0) return 0;
    
    const squaredDiffs = values.map(val => Math.pow(val - average, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    return stdDev / average; // Coefficient of variation
  }

  private rankAndSort(charges: RecurringCharge[]): RecurringCharge[] {
    return charges.sort((a, b) => {
      // Active charges first
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      
      // High confidence first
      if (Math.abs(a.confidence - b.confidence) > 10) {
        return b.confidence - a.confidence;
      }
      
      // Larger amounts first
      return b.averageAmount - a.averageAmount;
    });
  }

  // Merge similar charges
  mergeSimilarRecurringCharges(charges: RecurringCharge[]): RecurringCharge[] {
    const merged: RecurringCharge[] = [];
    const processed = new Set<string>();
    
    for (const charge of charges) {
      if (processed.has(charge.id)) continue;
      
      let mergedCharge = { ...charge };
      processed.add(charge.id);
      
      for (const other of charges) {
        if (processed.has(other.id)) continue;
        
        // Smart merging with looser criteria
        const merchantSimilar = areMerchantsSimilar(
          charge.normalizedMerchant, 
          other.normalizedMerchant, 
          0.85
        );
        
        const amountSimilar = Math.abs(charge.averageAmount - other.averageAmount) / 
                             charge.averageAmount < 0.15;
        
        const patternCompatible = charge.pattern === other.pattern || 
                                 (charge.pattern === 'irregular' || other.pattern === 'irregular');
        
        if (merchantSimilar && amountSimilar && patternCompatible) {
          // Merge transactions
          mergedCharge.transactions = [...mergedCharge.transactions, ...other.transactions]
            .sort((a, b) => a.date.getTime() - b.date.getTime());
          
          // Remove duplicates by transaction ID
          const uniqueTxns = new Map<string, Transaction>();
          mergedCharge.transactions.forEach(txn => {
            uniqueTxns.set(txn.id, txn);
          });
          mergedCharge.transactions = Array.from(uniqueTxns.values());
          
          // Recalculate statistics
          const amounts = mergedCharge.transactions.map(t => t.amount);
          mergedCharge.averageAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
          mergedCharge.confidence = Math.max(mergedCharge.confidence, other.confidence);
          
          processed.add(other.id);
        }
      }
      
      merged.push(mergedCharge);
    }
    
    return merged;
  }
}