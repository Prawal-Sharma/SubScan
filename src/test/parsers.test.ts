import { describe, it, expect } from 'vitest';
import { WellsFargoParser } from '../parsers/wellsFargoParser';
import { BankOfAmericaParser } from '../parsers/bankOfAmericaParser';
import { ChaseParser } from '../parsers/chaseParser';
import { DiscoverParser } from '../parsers/discoverParser';
import { CapitalOneParser } from '../parsers/capitalOneParser';

describe('Bank Parsers', () => {
  describe('WellsFargoParser', () => {
    it('should initialize correctly', () => {
      const parser = new WellsFargoParser();
      expect(parser).toBeDefined();
    });
    
    it('should return error for invalid text', () => {
      const parser = new WellsFargoParser();
      const result = parser.parse('invalid text');
      expect(result.success).toBe(false);
    });
  });
  
  describe('BankOfAmericaParser', () => {
    it('should initialize correctly', () => {
      const parser = new BankOfAmericaParser();
      expect(parser).toBeDefined();
    });
    
    it('should detect Bank of America format', () => {
      const parser = new BankOfAmericaParser();
      const mockText = `
        Bank of America
        Business Checking
        Account number: 1234567890
        February 1, 2022 to February 28, 2022
      `;
      const result = parser.parse(mockText);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.institution).toBe('Bank of America');
      }
    });
  });
  
  describe('ChaseParser', () => {
    it('should initialize correctly', () => {
      const parser = new ChaseParser();
      expect(parser).toBeDefined();
    });
    
    it('should detect Chase format', () => {
      const parser = new ChaseParser();
      const mockText = `
        Chase
        Account: 987654321
        July 1, 2022 through July 31, 2022
      `;
      const result = parser.parse(mockText);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.institution).toBe('Chase');
      }
    });
  });
  
  describe('DiscoverParser', () => {
    it('should initialize correctly', () => {
      const parser = new DiscoverParser();
      expect(parser).toBeDefined();
    });
    
    it('should detect Discover format', () => {
      const parser = new DiscoverParser();
      const mockText = `
        Discover it Card
        Account ending in 1234
        Open Date: Sep 15, 2022 - Close Date: Oct 26, 2022
      `;
      const result = parser.parse(mockText);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.institution).toBe('Discover');
      }
    });
  });
  
  describe('CapitalOneParser', () => {
    it('should initialize correctly', () => {
      const parser = new CapitalOneParser();
      expect(parser).toBeDefined();
    });
    
    it('should detect Capital One format', () => {
      const parser = new CapitalOneParser();
      const mockText = `
        Capital One Venture
        Account ending in 5678
        October 1 - October 31, 2022
      `;
      const result = parser.parse(mockText);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.institution).toBe('Capital One');
      }
    });
  });
});