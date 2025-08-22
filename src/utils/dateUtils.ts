import { parse, differenceInDays, addDays, isValid } from 'date-fns';

export function parseStatementDate(dateStr: string, year?: number): Date | null {
  if (!dateStr) return null;
  
  const currentYear = year || new Date().getFullYear();
  
  // Try different date formats
  const formats = [
    'M/d',      // Wells Fargo format: 7/1
    'MM/dd',    // Wells Fargo format: 07/01  
    'MMM d',    // Capital One format: May 3
    'MMM dd',   // Capital One format: May 03
    'M/d/yyyy',
    'MM/dd/yyyy',
    'yyyy-MM-dd',
  ];
  
  for (const formatStr of formats) {
    try {
      let dateToTry = dateStr;
      
      // If no year in the date string and format doesn't include year
      if (!formatStr.includes('yyyy') && !dateStr.includes(String(currentYear))) {
        dateToTry = `${dateStr}/${currentYear}`;
        
        const parsed = parse(dateToTry, `${formatStr}/yyyy`, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } else {
        const parsed = parse(dateToTry, formatStr, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Try next format
    }
  }
  
  return null;
}

export function detectRecurrencePattern(dates: Date[]): {
  pattern: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'irregular';
  intervalDays: number;
  confidence: number;
} {
  if (dates.length < 2) {
    return { pattern: 'irregular', intervalDays: 0, confidence: 0 };
  }
  
  // Sort dates
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  
  // Calculate intervals between consecutive dates
  const intervals: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    intervals.push(differenceInDays(sortedDates[i], sortedDates[i - 1]));
  }
  
  // Calculate average interval
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  
  // Calculate standard deviation
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  
  // Determine pattern based on average interval
  let pattern: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'irregular';
  let expectedInterval: number;
  
  if (avgInterval >= 5 && avgInterval <= 9) {
    pattern = 'weekly';
    expectedInterval = 7;
  } else if (avgInterval >= 13 && avgInterval <= 16) {
    pattern = 'biweekly';
    expectedInterval = 14;
  } else if (avgInterval >= 28 && avgInterval <= 32) {
    pattern = 'monthly';
    expectedInterval = 30;
  } else if (avgInterval >= 88 && avgInterval <= 92) {
    pattern = 'quarterly';
    expectedInterval = 90;
  } else if (avgInterval >= 360 && avgInterval <= 370) {
    pattern = 'annual';
    expectedInterval = 365;
  } else {
    pattern = 'irregular';
    expectedInterval = avgInterval;
  }
  
  // Calculate confidence based on consistency (lower std dev = higher confidence)
  const maxAcceptableDeviation = expectedInterval * 0.15; // 15% deviation
  const confidence = Math.max(0, Math.min(100, 100 - (stdDev / maxAcceptableDeviation) * 50));
  
  return {
    pattern,
    intervalDays: Math.round(avgInterval),
    confidence: Math.round(confidence),
  };
}

export function predictNextOccurrence(dates: Date[], intervalDays: number): Date | null {
  if (dates.length === 0 || intervalDays <= 0) return null;
  
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const lastDate = sortedDates[sortedDates.length - 1];
  
  return addDays(lastDate, intervalDays);
}