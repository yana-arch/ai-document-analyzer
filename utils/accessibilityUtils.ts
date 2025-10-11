// Accessibility utility functions and constants

// ARIA labels and descriptions
export const ariaLabels = {
  navigation: {
    main: 'Main navigation',
    skipToContent: 'Skip to main content',
    openMenu: 'Open navigation menu',
    closeMenu: 'Close navigation menu',
  },

  actions: {
    edit: 'Edit item',
    delete: 'Delete item',
    save: 'Save changes',
    cancel: 'Cancel action',
    confirm: 'Confirm action',
    close: 'Close',
    expand: 'Expand section',
    collapse: 'Collapse section',
    moreOptions: 'More options',
  },

  form: {
    required: 'Required field',
    optional: 'Optional field',
    error: 'Error message',
    success: 'Success message',
    loading: 'Loading...',
  },

  content: {
    loading: 'Content is loading',
    error: 'Error loading content',
    empty: 'No content available',
    searchResults: 'Search results',
  }
};

// Keyboard navigation utilities
export const keyCodes = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
} as const;

// Focus management utilities
export const focusUtils = {
  // Focus trap for modals and dialogs
  trapFocus: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== keyCodes.TAB) return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  },

  // Manage focus for dynamic content
  manageFocus: (action: 'save' | 'restore', element?: HTMLElement) => {
    if (action === 'save') {
      return document.activeElement as HTMLElement;
    } else if (action === 'restore' && element) {
      element.focus();
    }
  },

  // Auto-focus first interactive element
  autoFocus: (container: HTMLElement) => {
    const focusableElement = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;

    if (focusableElement) {
      focusableElement.focus();
    }
  }
};

// Screen reader utilities
export const screenReaderUtils = {
  // Announce dynamic content changes
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;

    document.body.appendChild(announcer);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },

  // Create screen reader only text
  createSROnlyText: (text: string) => {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    return span;
  }
};

// Color contrast utilities
export const colorContrast = {
  // Check if color combination meets WCAG guidelines
  isAccessible: (foreground: string, background: string): boolean => {
    // This is a simplified check - in production, you'd use a proper contrast calculation
    const contrastRatio = getContrastRatio(foreground, background);
    return contrastRatio >= 4.5; // WCAG AA standard
  },

  // Get suggested accessible color
  getAccessibleColor: (color: string, background: string): string => {
    if (colorContrast.isAccessible(color, background)) {
      return color;
    }

    // Return contrasting color (simplified logic)
    return color === '#000000' ? '#ffffff' : '#000000';
  }
};

// Simplified contrast ratio calculation
const getContrastRatio = (color1: string, color2: string): number => {
  // This is a placeholder - implement proper luminance calculation
  return 4.5; // Simplified for demo
};

// Reduced motion utilities
export const motionUtils = {
  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Get motion-safe animation duration
  getSafeDuration: (duration: number): number => {
    return motionUtils.prefersReducedMotion() ? Math.min(duration * 2, 1000) : duration;
  },

  // Get motion-safe animation properties
  getSafeAnimation: (animation: Record<string, any>) => {
    if (motionUtils.prefersReducedMotion()) {
      return {
        ...animation,
        transition: {
          ...animation.transition,
          duration: Math.min((animation.transition?.duration || 0.3) * 2, 1)
        }
      };
    }
    return animation;
  }
};

// Form accessibility utilities
export const formAccessibility = {
  // Generate unique IDs for form elements
  generateId: (prefix: string = 'field'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Create accessible form field
  createAccessibleField: (
    label: string,
    input: HTMLElement,
    options: {
      required?: boolean;
      describedBy?: string;
      error?: string;
    } = {}
  ) => {
    const fieldId = formAccessibility.generateId('field');
    const errorId = options.error ? formAccessibility.generateId('error') : undefined;
    const descriptionId = options.describedBy ? formAccessibility.generateId('description') : undefined;

    // Set up input attributes
    input.id = fieldId;
    input.setAttribute('aria-required', options.required ? 'true' : 'false');

    if (errorId) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `${errorId} ${descriptionId || ''}`.trim());
    } else if (descriptionId) {
      input.setAttribute('aria-describedby', descriptionId);
    }

    return {
      fieldId,
      errorId,
      descriptionId,
      label,
      input,
      error: options.error
    };
  }
};

// Live region utilities for dynamic updates
export const liveRegions = {
  // Create a live region for announcements
  createLiveRegion: (id: string, atomic: boolean = true) => {
    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', atomic.toString());
    region.className = 'sr-only';
    document.body.appendChild(region);
    return region;
  },

  // Update live region content
  updateLiveRegion: (regionId: string, message: string) => {
    const region = document.getElementById(regionId);
    if (region) {
      region.textContent = message;
    }
  }
};

// High contrast mode utilities
export const highContrastUtils = {
  // Check if high contrast mode is active
  isHighContrast: (): boolean => {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },

  // Get high contrast aware colors
  getContrastAwareColor: (color: string): string => {
    if (highContrastUtils.isHighContrast()) {
      // Return more contrasting version of the color
      return color; // Simplified for demo
    }
    return color;
  }
};

// Utility class names for screen readers
export const srOnly = 'sr-only';
export const srOnlyFocusable = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0';

// Common accessibility patterns
export const a11yPatterns = {
  // Skip link pattern
  skipLink: (targetId: string) => ({
    href: `#${targetId}`,
    className: `${srOnlyFocusable} z-50 bg-blue-600 text-white px-4 py-2 rounded`,
    children: 'Skip to main content'
  }),

  // Loading spinner with accessibility
  loadingSpinner: (label: string = 'Loading') => ({
    role: 'status',
    'aria-label': label,
    'aria-live': 'polite' as const
  }),

  // Progress bar with accessibility
  progressBar: (value: number, max: number, label: string) => ({
    role: 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': label
  }),

  // Alert with accessibility
  alert: (type: 'error' | 'warning' | 'info' | 'success', message: string) => ({
    role: 'alert',
    'aria-live': 'assertive' as const,
    className: `alert alert-${type}`,
    children: message
  })
};
