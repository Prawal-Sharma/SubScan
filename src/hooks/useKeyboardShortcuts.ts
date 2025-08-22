import { useEffect } from 'react';

interface KeyboardShortcuts {
  onExport?: () => void;
  onStartOver?: () => void;
  onToggleView?: () => void;
  onEscape?: () => void;
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for modifier keys
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;
      
      // Export shortcut: Ctrl/Cmd + E
      if (isCtrlOrCmd && event.key === 'e') {
        event.preventDefault();
        shortcuts.onExport?.();
      }
      
      // Start over shortcut: Ctrl/Cmd + Shift + N
      if (isCtrlOrCmd && isShift && event.key === 'N') {
        event.preventDefault();
        shortcuts.onStartOver?.();
      }
      
      // Toggle view shortcut: Ctrl/Cmd + V
      if (isCtrlOrCmd && event.key === 'v') {
        event.preventDefault();
        shortcuts.onToggleView?.();
      }
      
      // Escape key
      if (event.key === 'Escape') {
        shortcuts.onEscape?.();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}

/**
 * Hook for focus trap within a modal or dialog
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    // Focus first element when trap becomes active
    firstElement?.focus();
    
    container.addEventListener('keydown', handleTabKey);
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [containerRef, isActive]);
}

/**
 * Announce changes for screen readers
 */
export function useAnnouncer() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', priority);
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  };
  
  return { announce };
}