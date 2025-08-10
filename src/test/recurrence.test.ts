import { describe, it, expect } from 'vitest';
import { RecurrenceDetector } from '../engines/recurrenceDetector';
import { AdvancedRecurrenceDetector } from '../engines/advancedRecurrenceDetector';
import { Transaction } from '../types';
import { normalizeMerchant } from '../utils/merchantNormalizer';

describe('Recurrence Detection', () => {
  const createMockTransaction = (
    date: Date,
    merchant: string,
    amount: number
  ): Transaction => ({
    id: Math.random().toString(36),
    date,
    description: merchant,
    merchant,
    normalizedMerchant: normalizeMerchant(merchant),
    amount,
    type: 'debit',
  });
  
  describe('RecurrenceDetector', () => {
    it('should detect monthly subscriptions', () => {
      const detector = new RecurrenceDetector();
      const transactions: Transaction[] = [
        createMockTransaction(new Date('2024-01-15'), 'Netflix', 15.99),
        createMockTransaction(new Date('2024-02-15'), 'Netflix', 15.99),
        createMockTransaction(new Date('2024-03-15'), 'Netflix', 15.99),
      ];
      
      const recurring = detector.detectRecurringCharges(transactions);
      expect(recurring).toHaveLength(1);
      expect(recurring[0].pattern).toBe('monthly');
      expect(recurring[0].merchant).toBe('Netflix');
    });
    
    it('should handle amount variations', () => {
      const detector = new RecurrenceDetector();
      const transactions: Transaction[] = [
        createMockTransaction(new Date('2024-01-10'), 'Utility Co', 120.00),
        createMockTransaction(new Date('2024-02-10'), 'Utility Co', 135.00),
        createMockTransaction(new Date('2024-03-10'), 'Utility Co', 128.00),
      ];
      
      const recurring = detector.detectRecurringCharges(transactions);
      expect(recurring).toHaveLength(1);
      expect(recurring[0].amountVariance).toBeGreaterThan(0);
    });
  });
  
  describe('AdvancedRecurrenceDetector', () => {
    it('should cluster similar merchants', () => {
      const detector = new AdvancedRecurrenceDetector();
      const transactions: Transaction[] = [
        createMockTransaction(new Date('2024-01-15'), 'NETFLIX.COM', 15.99),
        createMockTransaction(new Date('2024-02-15'), 'Netflix', 15.99),
        createMockTransaction(new Date('2024-03-15'), 'NETFLIX STREAMING', 15.99),
      ];
      
      const recurring = detector.detectRecurringCharges(transactions);
      expect(recurring).toHaveLength(1);
      expect(recurring[0].transactions).toHaveLength(3);
    });
    
    it('should boost confidence for known subscriptions', () => {
      const detector = new AdvancedRecurrenceDetector();
      const transactions: Transaction[] = [
        createMockTransaction(new Date('2024-01-01'), 'Spotify', 9.99),
        createMockTransaction(new Date('2024-02-01'), 'Spotify', 9.99),
      ];
      
      const recurring = detector.detectRecurringCharges(transactions);
      expect(recurring).toHaveLength(1);
      expect(recurring[0].confidence).toBeGreaterThan(50);
    });
    
    it('should detect weekly patterns', () => {
      const detector = new AdvancedRecurrenceDetector();
      const transactions: Transaction[] = [
        createMockTransaction(new Date('2024-01-01'), 'Coffee Shop', 25.00),
        createMockTransaction(new Date('2024-01-08'), 'Coffee Shop', 25.00),
        createMockTransaction(new Date('2024-01-15'), 'Coffee Shop', 25.00),
        createMockTransaction(new Date('2024-01-22'), 'Coffee Shop', 25.00),
      ];
      
      const recurring = detector.detectRecurringCharges(transactions);
      expect(recurring).toHaveLength(1);
      expect(recurring[0].pattern).toBe('weekly');
    });
  });
});