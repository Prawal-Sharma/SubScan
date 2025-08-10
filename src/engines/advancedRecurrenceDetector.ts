import { Transaction, RecurringCharge } from '../types';
import { areMerchantsSimilar } from '../utils/merchantNormalizer';
import { v4 as uuidv4 } from 'uuid';

interface PatternAnalysis {
  pattern: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'irregular';
  intervalDays: number;
  confidence: number;
  stdDeviation: number;
  outliers: number[];
}

interface MerchantCluster {
  primaryMerchant: string;
  variations: Set<string>;
  transactions: Transaction[];
}

export class AdvancedRecurrenceDetector {
  private minTransactions = 2;
  private similarityThreshold = 0.75; // Lower for better fuzzy matching
  private amountVarianceThreshold = 0.25; // Allow 25% variance
  private outlierThreshold = 2.5; // Standard deviations for outlier detection
  
  // Known subscription patterns
  private knownSubscriptions = new Map<string, { pattern: string; typical: number[] }>([
    ['netflix', { pattern: 'monthly', typical: [8.99, 12.99, 15.99, 19.99] }],
    ['spotify', { pattern: 'monthly', typical: [9.99, 15.99] }],
    ['youtube', { pattern: 'monthly', typical: [11.99, 15.99, 22.99, 72.99] }],
    ['amazon prime', { pattern: 'monthly', typical: [14.99, 139] }],
    ['hulu', { pattern: 'monthly', typical: [7.99, 12.99, 69.99, 75.99] }],
    ['disney', { pattern: 'monthly', typical: [7.99, 13.99] }],
    ['apple', { pattern: 'monthly', typical: [0.99, 4.99, 9.99, 14.99, 19.99] }],
    ['microsoft', { pattern: 'monthly', typical: [6.99, 9.99, 12.99] }],
    ['adobe', { pattern: 'monthly', typical: [9.99, 19.99, 52.99] }],
    ['dropbox', { pattern: 'monthly', typical: [9.99, 11.99, 19.99] }],
  ]);
  
  detectRecurringCharges(transactions: Transaction[]): RecurringCharge[] {
    // Step 1: Intelligent merchant clustering
    const clusters = this.clusterMerchants(transactions);
    
    // Step 2: Analyze each cluster for patterns
    const recurringCharges: RecurringCharge[] = [];
    
    for (const cluster of clusters) {
      if (cluster.transactions.length < this.minTransactions) continue;
      
      // Sort transactions by date
      const sortedTransactions = [...cluster.transactions].sort((a, b) => 
        a.date.getTime() - b.date.getTime()
      );
      
      // Advanced pattern analysis
      const analysis = this.analyzePattern(sortedTransactions);
      
      // Skip if pattern is too irregular
      if (analysis.confidence < 40) continue;
      
      // Calculate amount statistics with outlier detection
      const amounts = sortedTransactions.map(t => t.amount);
      const { average, variance } = this.calculateRobustStatistics(amounts);
      
      // Predict next occurrence
      const dates = sortedTransactions.map(t => t.date);
      const nextDueDate = this.predictNextOccurrenceAdvanced(dates, analysis);
      
      // Check if subscription is active
      const isActive = this.isSubscriptionActive(sortedTransactions, analysis);
      
      // Boost confidence for known subscriptions
      const confidenceBoost = this.getConfidenceBoost(cluster.primaryMerchant, average);
      const finalConfidence = Math.min(100, analysis.confidence + confidenceBoost);
      
      recurringCharges.push({
        id: uuidv4(),
        merchant: cluster.primaryMerchant,
        normalizedMerchant: sortedTransactions[0].normalizedMerchant,
        transactions: sortedTransactions,
        pattern: analysis.pattern,
        averageAmount: Math.round(average * 100) / 100,
        amountVariance: variance,
        nextDueDate: nextDueDate || undefined,
        confidence: finalConfidence,
        intervalDays: analysis.intervalDays,
        isActive,
      });
    }
    
    // Step 3: Post-process and rank results
    return this.rankRecurringCharges(recurringCharges);
  }
  
  private clusterMerchants(transactions: Transaction[]): MerchantCluster[] {
    const clusters: MerchantCluster[] = [];
    const processed = new Set<string>();
    
    for (const transaction of transactions) {
      if (processed.has(transaction.id)) continue;
      
      // Check if transaction belongs to existing cluster
      let foundCluster = false;
      for (const cluster of clusters) {
        if (this.belongsToCluster(transaction, cluster)) {
          cluster.transactions.push(transaction);
          cluster.variations.add(transaction.merchant);
          processed.add(transaction.id);
          foundCluster = true;
          break;
        }
      }
      
      if (!foundCluster) {
        // Create new cluster
        const newCluster: MerchantCluster = {
          primaryMerchant: transaction.merchant,
          variations: new Set([transaction.merchant]),
          transactions: [transaction],
        };
        
        // Find all similar transactions
        for (const other of transactions) {
          if (processed.has(other.id)) continue;
          if (this.belongsToCluster(other, newCluster)) {
            newCluster.transactions.push(other);
            newCluster.variations.add(other.merchant);
            processed.add(other.id);
          }
        }
        
        processed.add(transaction.id);
        clusters.push(newCluster);
      }
    }
    
    return clusters;
  }
  
  private belongsToCluster(transaction: Transaction, cluster: MerchantCluster): boolean {
    // Check merchant similarity
    for (const merchant of cluster.variations) {
      if (areMerchantsSimilar(
        transaction.normalizedMerchant,
        merchant.toLowerCase(),
        this.similarityThreshold
      )) {
        // Check amount similarity
        const clusterAmounts = cluster.transactions.map(t => t.amount);
        const avgAmount = clusterAmounts.reduce((sum, val) => sum + val, 0) / clusterAmounts.length;
        const amountRatio = Math.min(transaction.amount, avgAmount) / 
                           Math.max(transaction.amount, avgAmount);
        
        if (amountRatio >= (1 - this.amountVarianceThreshold)) {
          return true;
        }
      }
    }
    return false;
  }
  
  private analyzePattern(transactions: Transaction[]): PatternAnalysis {
    const dates = transactions.map(t => t.date);
    const intervals: number[] = [];
    
    for (let i = 1; i < dates.length; i++) {
      const days = Math.floor(
        (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      );
      intervals.push(days);
    }
    
    if (intervals.length === 0) {
      return {
        pattern: 'irregular',
        intervalDays: 0,
        confidence: 0,
        stdDeviation: 0,
        outliers: [],
      };
    }
    
    // Calculate statistics
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const stdDev = Math.sqrt(
      intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length
    );
    
    // Detect outliers
    const outliers: number[] = [];
    intervals.forEach((interval, index) => {
      if (Math.abs(interval - avgInterval) > this.outlierThreshold * stdDev) {
        outliers.push(index);
      }
    });
    
    // Determine pattern with fuzzy matching
    let pattern: PatternAnalysis['pattern'] = 'irregular';
    let confidence = 0;
    
    // Weekly (7 ± 2 days)
    if (avgInterval >= 5 && avgInterval <= 9) {
      pattern = 'weekly';
      confidence = 100 - (stdDev / avgInterval) * 100;
    }
    // Biweekly (14 ± 3 days)
    else if (avgInterval >= 11 && avgInterval <= 17) {
      pattern = 'biweekly';
      confidence = 100 - (stdDev / avgInterval) * 100;
    }
    // Monthly (30 ± 5 days)
    else if (avgInterval >= 25 && avgInterval <= 35) {
      pattern = 'monthly';
      confidence = 100 - (stdDev / avgInterval) * 100;
    }
    // Quarterly (90 ± 10 days)
    else if (avgInterval >= 80 && avgInterval <= 100) {
      pattern = 'quarterly';
      confidence = 100 - (stdDev / avgInterval) * 100;
    }
    // Annual (365 ± 30 days)
    else if (avgInterval >= 335 && avgInterval <= 395) {
      pattern = 'annual';
      confidence = 100 - (stdDev / avgInterval) * 100;
    }
    
    // Penalize for outliers
    confidence = confidence * (1 - outliers.length / intervals.length * 0.5);
    
    return {
      pattern,
      intervalDays: Math.round(avgInterval),
      confidence: Math.max(0, Math.min(100, confidence)),
      stdDeviation: stdDev,
      outliers,
    };
  }
  
  private calculateRobustStatistics(amounts: number[]): {
    average: number;
    variance: number;
    filtered: number[];
  } {
    if (amounts.length === 0) {
      return { average: 0, variance: 0, filtered: [] };
    }
    
    // Calculate initial statistics
    const initialAvg = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const initialStdDev = Math.sqrt(
      amounts.reduce((sum, val) => sum + Math.pow(val - initialAvg, 2), 0) / amounts.length
    );
    
    // Filter outliers
    const filtered = amounts.filter(amount => 
      Math.abs(amount - initialAvg) <= this.outlierThreshold * initialStdDev
    );
    
    // Recalculate with filtered data
    const average = filtered.length > 0
      ? filtered.reduce((sum, val) => sum + val, 0) / filtered.length
      : initialAvg;
    
    const variance = average > 0
      ? Math.sqrt(
          filtered.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / filtered.length
        ) / average
      : 0;
    
    return { average, variance, filtered };
  }
  
  private predictNextOccurrenceAdvanced(
    dates: Date[],
    analysis: PatternAnalysis
  ): Date | null {
    if (dates.length === 0 || analysis.confidence < 40) return null;
    
    const lastDate = dates[dates.length - 1];
    const nextDate = new Date(lastDate);
    
    // Use pattern-specific logic
    switch (analysis.pattern) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        // Try to maintain the same day of month
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'annual':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + analysis.intervalDays);
    }
    
    // Only predict if it's in the future or very recent past
    const daysSinceLastTransaction = Math.floor(
      (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastTransaction > analysis.intervalDays * 2) {
      return null; // Subscription likely cancelled
    }
    
    return nextDate;
  }
  
  private isSubscriptionActive(
    transactions: Transaction[],
    analysis: PatternAnalysis
  ): boolean {
    if (transactions.length === 0) return false;
    
    const lastTransaction = transactions[transactions.length - 1];
    const daysSinceLastTransaction = Math.floor(
      (new Date().getTime() - lastTransaction.date.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Consider active if within 1.5x the expected interval
    // Account for billing delays and weekends
    const tolerance = analysis.pattern === 'annual' ? 2.0 : 1.5;
    return daysSinceLastTransaction <= analysis.intervalDays * tolerance;
  }
  
  private getConfidenceBoost(merchant: string, amount: number): number {
    const merchantLower = merchant.toLowerCase();
    
    for (const [key, info] of this.knownSubscriptions.entries()) {
      if (merchantLower.includes(key)) {
        // Check if amount matches typical subscription amounts
        for (const typical of info.typical) {
          if (Math.abs(amount - typical) / typical < 0.1) {
            return 20; // High confidence boost
          }
        }
        return 10; // Moderate boost for name match
      }
    }
    
    return 0;
  }
  
  private rankRecurringCharges(charges: RecurringCharge[]): RecurringCharge[] {
    return charges.sort((a, b) => {
      // Priority 1: Active subscriptions
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      
      // Priority 2: High confidence (80%+)
      if (a.confidence >= 80 && b.confidence < 80) return -1;
      if (b.confidence >= 80 && a.confidence < 80) return 1;
      
      // Priority 3: Regular patterns (monthly, weekly)
      const regularPatterns = ['monthly', 'weekly', 'biweekly'];
      const aIsRegular = regularPatterns.includes(a.pattern);
      const bIsRegular = regularPatterns.includes(b.pattern);
      if (aIsRegular !== bIsRegular) return aIsRegular ? -1 : 1;
      
      // Priority 4: Higher amounts (likely more important)
      if (Math.abs(a.averageAmount - b.averageAmount) > 10) {
        return b.averageAmount - a.averageAmount;
      }
      
      // Priority 5: Confidence
      return b.confidence - a.confidence;
    });
  }
}