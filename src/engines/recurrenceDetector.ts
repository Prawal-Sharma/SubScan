import { Transaction, RecurringCharge } from '../types';
import { areMerchantsSimilar } from '../utils/merchantNormalizer';
import { detectRecurrencePattern, predictNextOccurrence } from '../utils/dateUtils';
import { v4 as uuidv4 } from 'uuid';

export class RecurrenceDetector {
  private minTransactions = 2; // Minimum transactions to consider recurring
  private similarityThreshold = 0.8; // Merchant name similarity threshold
  private amountVarianceThreshold = 0.2; // 20% variance in amount is acceptable
  
  detectRecurringCharges(transactions: Transaction[]): RecurringCharge[] {
    // Group transactions by similar merchants
    const merchantGroups = this.groupByMerchant(transactions);
    
    // Analyze each group for recurrence patterns
    const recurringCharges: RecurringCharge[] = [];
    
    for (const group of merchantGroups) {
      if (group.length < this.minTransactions) continue;
      
      // Sort transactions by date
      const sortedTransactions = [...group].sort((a, b) => 
        a.date.getTime() - b.date.getTime()
      );
      
      // Analyze recurrence pattern
      const dates = sortedTransactions.map(t => t.date);
      const { pattern, intervalDays, confidence } = detectRecurrencePattern(dates);
      
      // Calculate amount statistics
      const amounts = sortedTransactions.map(t => t.amount);
      const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
      const variance = this.calculateVariance(amounts, avgAmount);
      
      // Predict next occurrence
      const nextDueDate = predictNextOccurrence(dates, intervalDays);
      
      // Determine if still active (last transaction within expected interval * 1.5)
      const lastTransaction = sortedTransactions[sortedTransactions.length - 1];
      const daysSinceLastTransaction = Math.floor(
        (new Date().getTime() - lastTransaction.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isActive = daysSinceLastTransaction <= intervalDays * 1.5;
      
      recurringCharges.push({
        id: uuidv4(),
        merchant: sortedTransactions[0].merchant,
        normalizedMerchant: sortedTransactions[0].normalizedMerchant,
        transactions: sortedTransactions,
        pattern,
        averageAmount: Math.round(avgAmount * 100) / 100,
        amountVariance: variance,
        nextDueDate,
        confidence,
        intervalDays,
        isActive,
      });
    }
    
    // Sort by confidence and amount
    return recurringCharges.sort((a, b) => {
      // First by active status
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      // Then by confidence
      if (Math.abs(a.confidence - b.confidence) > 10) {
        return b.confidence - a.confidence;
      }
      // Then by amount
      return b.averageAmount - a.averageAmount;
    });
  }
  
  private groupByMerchant(transactions: Transaction[]): Transaction[][] {
    const groups: Transaction[][] = [];
    const processed = new Set<string>();
    
    for (const transaction of transactions) {
      if (processed.has(transaction.id)) continue;
      
      const group: Transaction[] = [transaction];
      processed.add(transaction.id);
      
      // Find all similar transactions
      for (const other of transactions) {
        if (processed.has(other.id)) continue;
        
        if (areMerchantsSimilar(
          transaction.normalizedMerchant,
          other.normalizedMerchant,
          this.similarityThreshold
        )) {
          // Check if amounts are similar (within variance threshold)
          const amountRatio = Math.min(transaction.amount, other.amount) / 
                             Math.max(transaction.amount, other.amount);
          
          if (amountRatio >= (1 - this.amountVarianceThreshold)) {
            group.push(other);
            processed.add(other.id);
          }
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }
  
  private calculateVariance(amounts: number[], average: number): number {
    if (amounts.length === 0) return 0;
    
    const squaredDiffs = amounts.map(amount => Math.pow(amount - average, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / amounts.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // Return coefficient of variation (relative standard deviation)
    return average > 0 ? (stdDev / average) : 0;
  }
  
  // Merge similar recurring charges that might have been split
  mergeSimiiarRecurringCharges(charges: RecurringCharge[]): RecurringCharge[] {
    const merged: RecurringCharge[] = [];
    const processed = new Set<string>();
    
    for (const charge of charges) {
      if (processed.has(charge.id)) continue;
      
      let mergedCharge = { ...charge };
      processed.add(charge.id);
      
      for (const other of charges) {
        if (processed.has(other.id)) continue;
        
        // Check if merchants are similar and patterns match
        if (
          areMerchantsSimilar(charge.normalizedMerchant, other.normalizedMerchant, 0.9) &&
          charge.pattern === other.pattern &&
          Math.abs(charge.averageAmount - other.averageAmount) / charge.averageAmount < 0.1
        ) {
          // Merge the charges
          mergedCharge.transactions = [...mergedCharge.transactions, ...other.transactions]
            .sort((a, b) => a.date.getTime() - b.date.getTime());
          
          // Recalculate statistics
          const amounts = mergedCharge.transactions.map(t => t.amount);
          mergedCharge.averageAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
          
          processed.add(other.id);
        }
      }
      
      merged.push(mergedCharge);
    }
    
    return merged;
  }
}