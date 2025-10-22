import React, { useEffect, useCallback } from 'react';

interface FocusManagerProps {
  isEnabled?: boolean;
  restoreOnMount?: boolean;
  preserveScroll?: boolean;
}

export const FocusManager: React.FC<FocusManagerProps> = ({
  isEnabled = true,
  restoreOnMount = true,
  preserveScroll = true
}) => {
  const saveFocus = useCallback(() => {
    if (!isEnabled) return;

    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body) {
      localStorage.setItem('lastFocusedElement', JSON.stringify({
        tagName: activeElement.tagName.toLowerCase(),
        id: activeElement.id,
        className: activeElement.className,
        timestamp: Date.now()
      }));
    }

    if (preserveScroll) {
      localStorage.setItem('scrollPosition', JSON.stringify({
        x: window.scrollX,
        y: window.scrollY,
        timestamp: Date.now()
      }));
    }
  }, [isEnabled, preserveScroll]);

  const restoreFocus = useCallback(() => {
    if (!isEnabled || !restoreOnMount) return;

    try {
      const savedFocus = localStorage.getItem('lastFocusedElement');
      const savedScroll = localStorage.getItem('scrollPosition');

      if (savedScroll) {
        const { x, y, timestamp } = JSON.parse(savedScroll);
        // Only restore if saved within last 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          window.scrollTo(x, y);
        }
      }

      if (savedFocus) {
        const { tagName, id, className, timestamp } = JSON.parse(savedFocus);
        // Only restore if saved within last minute
        if (Date.now() - timestamp < 60 * 1000) {
          if (id) {
            const element = document.getElementById(id);
            if (element) {
              element.focus();
              return;
            }
          }

          // Try to find element by other means
          if (className) {
            // Properly escape and combine class names for selector
            const classSelector = className
              .split(/\s+/)
              .map(cls => CSS.escape(cls))
              .join('.');
            const elements = document.querySelectorAll(tagName + '.' + classSelector);
            if (elements.length > 0) {
              (elements[0] as HTMLElement).focus();
              return;
            }
          }

          // Try to find first focusable element of that type
          const elements = document.querySelectorAll(tagName);
          const focusableElements = Array.from(elements).filter(el =>
            (el as HTMLElement).tabIndex >= 0 ||
            ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(el.tagName)
          );
          if (focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
          }
        }
      }
    } catch (error) {
      console.warn('Failed to restore focus/scroll:', error);
    }
  }, [isEnabled, restoreOnMount]);

  useEffect(() => {
    if (!isEnabled) return;

    const handleBeforeUnload = () => saveFocus();
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveFocus();
      } else {
        restoreFocus();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial restoration
    requestAnimationFrame(restoreFocus);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveFocus, restoreFocus, isEnabled]);

  return null; // This component doesn't render anything
};
