import { AppState } from './stateManagement';
import { RecurringCharge } from '../types';

const STORAGE_KEYS = {
  APP_STATE: 'subscan_app_state',
  RECURRING_CHARGES: 'subscan_recurring_charges',
  USER_PREFERENCES: 'subscan_user_preferences',
  SESSION_METADATA: 'subscan_session_metadata'
};

export interface SessionMetadata {
  lastSaved: Date;
  version: string;
  totalTransactions: number;
  totalStatements: number;
  banks: string[];
}

export interface UserPreferences {
  dismissedCharges: string[];
  confirmedCharges: string[];
  customNames: Record<string, string>;
  categories: Record<string, string>;
  notes: Record<string, string>;
}

/**
 * Save the current session to localStorage
 */
export function saveSession(
  appState: AppState,
  recurringCharges: RecurringCharge[],
  preferences?: UserPreferences
): boolean {
  try {
    // Save app state (without large transaction data to save space)
    const stateToSave = {
      ...appState,
      // Store summary data instead of full transactions
      transactionCount: appState.allTransactions.length,
      statementCount: appState.processedStatements.length,
      // Keep statements but remove transaction arrays to save space
      processedStatements: appState.processedStatements.map(stmt => ({
        ...stmt,
        transactions: [] // Don't store transactions in localStorage
      }))
    };
    
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(stateToSave));
    
    // Save recurring charges
    localStorage.setItem(STORAGE_KEYS.RECURRING_CHARGES, JSON.stringify(recurringCharges));
    
    // Save user preferences
    if (preferences) {
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    }
    
    // Save metadata
    const metadata: SessionMetadata = {
      lastSaved: new Date(),
      version: '1.0.0',
      totalTransactions: appState.allTransactions.length,
      totalStatements: appState.processedStatements.length,
      banks: Array.from(appState.statementsByBank.keys())
    };
    localStorage.setItem(STORAGE_KEYS.SESSION_METADATA, JSON.stringify(metadata));
    
    return true;
  } catch (error) {
    console.error('Failed to save session:', error);
    return false;
  }
}

/**
 * Load a saved session from localStorage
 */
export function loadSession(): {
  appState?: Partial<AppState>;
  recurringCharges?: RecurringCharge[];
  preferences?: UserPreferences;
  metadata?: SessionMetadata;
} | null {
  try {
    const metadataStr = localStorage.getItem(STORAGE_KEYS.SESSION_METADATA);
    if (!metadataStr) return null;
    
    const metadata = JSON.parse(metadataStr) as SessionMetadata;
    
    // Check if session is too old (> 30 days)
    const lastSaved = new Date(metadata.lastSaved);
    const daysSinceSave = (Date.now() - lastSaved.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSave > 30) {
      clearSession();
      return null;
    }
    
    const appStateStr = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    const chargesStr = localStorage.getItem(STORAGE_KEYS.RECURRING_CHARGES);
    const prefsStr = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    
    return {
      appState: appStateStr ? JSON.parse(appStateStr) : undefined,
      recurringCharges: chargesStr ? JSON.parse(chargesStr) : undefined,
      preferences: prefsStr ? JSON.parse(prefsStr) : undefined,
      metadata
    };
  } catch (error) {
    console.error('Failed to load session:', error);
    return null;
  }
}

/**
 * Clear the saved session
 */
export function clearSession(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * Check if a session exists
 */
export function hasSession(): boolean {
  return localStorage.getItem(STORAGE_KEYS.SESSION_METADATA) !== null;
}

/**
 * Get session summary without loading full data
 */
export function getSessionSummary(): SessionMetadata | null {
  try {
    const metadataStr = localStorage.getItem(STORAGE_KEYS.SESSION_METADATA);
    if (!metadataStr) return null;
    
    return JSON.parse(metadataStr) as SessionMetadata;
  } catch (error) {
    return null;
  }
}

/**
 * Export session data as downloadable JSON
 */
export function exportSession(
  appState: AppState,
  recurringCharges: RecurringCharge[],
  preferences?: UserPreferences
): string {
  const exportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    summary: {
      totalStatements: appState.processedStatements.length,
      totalTransactions: appState.allTransactions.length,
      totalRecurringCharges: recurringCharges.length,
      dateRange: {
        start: appState.allTransactions.reduce((min, t) => 
          !min || t.date < min ? t.date : min, null as Date | null
        ),
        end: appState.allTransactions.reduce((max, t) => 
          !max || t.date > max ? t.date : max, null as Date | null
        )
      }
    },
    recurringCharges: recurringCharges.map(charge => ({
      merchant: charge.merchant,
      customName: preferences?.customNames[charge.id],
      category: preferences?.categories[charge.id],
      notes: preferences?.notes[charge.id],
      averageAmount: charge.averageAmount,
      pattern: charge.pattern,
      confidence: charge.confidence,
      isActive: charge.isActive,
      transactionCount: charge.transactions.length,
      firstSeen: charge.transactions[0]?.date,
      lastSeen: charge.transactions[charge.transactions.length - 1]?.date
    })),
    preferences
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Auto-save hook for React
 */
export function useAutoSave(
  appState: AppState,
  recurringCharges: RecurringCharge[],
  preferences?: UserPreferences
): void {
  // This would be implemented as a React hook with useEffect
  // For now, just providing the utility function
  if (appState.allTransactions.length > 0) {
    saveSession(appState, recurringCharges, preferences);
  }
}