import { useEffect } from 'react';

/**
 * Finds the nearest scrollable parent element for a given node.
 */
function getScrollParent(node: HTMLElement | null): HTMLElement {
  if (!node) return document.documentElement;
  let parent = node.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight + 2
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.documentElement;
}

/**
 * Smoothly scrolls an element into view above the virtual keyboard.
 */
function scrollElementAboveKeyboard(el: HTMLElement) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return;

  const scrollParent = getScrollParent(el);
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const elRect = el.getBoundingClientRect();

  // Target placing the input cleanly in the upper ~30% of the visible viewport (safely above keyboard)
  const desiredScreenY = Math.max(72, viewportHeight * 0.3);

  // If inside a scrollable modal or container
  if (scrollParent && scrollParent !== document.documentElement && scrollParent !== document.body) {
    const parentRect = scrollParent.getBoundingClientRect();
    const visibleContainerHeight = Math.min(parentRect.height, viewportHeight);
    const relativeTop = elRect.top - parentRect.top;
    const desiredOffset = scrollParent.scrollTop + relativeTop - visibleContainerHeight * 0.3;

    scrollParent.scrollTo({
      top: Math.max(0, desiredOffset),
      behavior: 'smooth',
    });
  } else {
    // Top-level document scroll: align against visualViewport so input stays well above keyboard
    const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const targetScrollY = currentScrollY + (elRect.top - desiredScreenY);

    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: 'smooth',
    });
  }
}

/**
 * Hook to manage mobile virtual keyboard behavior across all inputs in the app:
 * 1. Automatic scroll-into-view on focus.
 * 2. VisualViewport resize tracking on Android WebView & iOS Safari.
 * 3. Restores view when keyboard dismisses.
 */
export function useMobileKeyboardManager() {
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let focusTimer1: ReturnType<typeof setTimeout> | null = null;
    let focusTimer2: ReturnType<typeof setTimeout> | null = null;
    let focusTimer3: ReturnType<typeof setTimeout> | null = null;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT';

      if (!isInput) return;

      // Software keyboards animate up over 200-400ms on Android and iOS.
      // Trigger smooth scroll at intervals to ensure it stays in view once keyboard is fully open.
      if (focusTimer1) clearTimeout(focusTimer1);
      if (focusTimer2) clearTimeout(focusTimer2);
      if (focusTimer3) clearTimeout(focusTimer3);

      focusTimer1 = setTimeout(() => scrollElementAboveKeyboard(target), 80);
      focusTimer2 = setTimeout(() => scrollElementAboveKeyboard(target), 280);
      focusTimer3 = setTimeout(() => scrollElementAboveKeyboard(target), 450);
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        const stillInInput =
          active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.tagName === 'SELECT');

        if (!stillInInput) {
          document.documentElement.classList.remove('keyboard-open');
          document.documentElement.style.setProperty('--keyboard-height', '0px');
        }
      }, 200);
    };

    // Visual Viewport API (Standard across modern Android WebView & mobile browsers)
    const handleViewportChange = () => {
      if (resizeTimer) clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        if (!window.visualViewport) return;

        const currentHeight = window.visualViewport.height;
        const totalHeight = window.innerHeight;
        const keyboardHeight = Math.max(0, totalHeight - currentHeight);

        if (keyboardHeight > 140) {
          document.documentElement.classList.add('keyboard-open');
          document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);

          const active = document.activeElement as HTMLElement | null;
          if (
            active &&
            (active.tagName === 'INPUT' ||
              active.tagName === 'TEXTAREA' ||
              active.tagName === 'SELECT')
          ) {
            scrollElementAboveKeyboard(active);
          }
        } else {
          document.documentElement.classList.remove('keyboard-open');
          document.documentElement.style.setProperty('--keyboard-height', '0px');
        }
      }, 50);
    };

    document.addEventListener('focusin', handleFocusIn, { passive: true });
    document.addEventListener('focusout', handleFocusOut, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    return () => {
      if (focusTimer1) clearTimeout(focusTimer1);
      if (focusTimer2) clearTimeout(focusTimer2);
      if (focusTimer3) clearTimeout(focusTimer3);
      if (resizeTimer) clearTimeout(resizeTimer);

      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, []);
}
