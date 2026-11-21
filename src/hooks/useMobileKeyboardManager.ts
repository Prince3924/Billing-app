import { useEffect } from 'react';

const NON_KEYBOARD_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'file',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'hidden',
  'image',
]);

function isKeyboardInput(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
  if (el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    return !NON_KEYBOARD_INPUT_TYPES.has(type);
  }
  return false;
}

function isLikelyTouchMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return hasTouch && window.innerWidth <= 1024;
}

/**
 * Collects all scrollable ancestors from innermost to outermost.
 * Stops before Window if a `position: fixed` backdrop is encountered,
 * because fixed overlays do not move with `window.scrollY`.
 */
function getScrollAncestors(node: HTMLElement): Array<HTMLElement | Window> {
  const list: Array<HTMLElement | Window> = [];
  let cur: HTMLElement | null = node.parentElement;
  let insideFixed = false;

  while (cur && cur !== document.body && cur !== document.documentElement) {
    const style = window.getComputedStyle(cur);
    const overflowY = style.overflowY;
    const isScrollable =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      cur.scrollHeight > cur.clientHeight + 2;

    if (isScrollable) {
      list.push(cur);
    }

    if (style.position === 'fixed') {
      insideFixed = true;
      break;
    }

    cur = cur.parentElement;
  }

  if (!insideFixed) {
    const rootStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = window.getComputedStyle(document.body);
    if (
      bodyStyle.overflowY === 'auto' ||
      bodyStyle.overflowY === 'scroll'
    ) {
      if (document.body.scrollHeight > document.body.clientHeight + 2) {
        list.push(document.body);
      }
    }
    if (rootStyle.overflowY !== 'hidden') {
      list.push(window);
    }
  }

  return list;
}

interface ViewportMetrics {
  vvHeight: number;
  vvOffsetTop: number;
  rawOverlayInset: number;
  windowShrankHeight: number;
  effectiveVisibleHeight: number;
  usingFallbackEstimate: boolean;
}

/**
 * Scrolls all necessary ancestor containers so the focused input stays
 * clearly visible ABOVE the soft keyboard (and never under sticky headers).
 */
function scrollElementAboveKeyboard(el: HTMLElement, metrics: ViewportMetrics) {
  if (!el || typeof el.getBoundingClientRect !== 'function' || !el.isConnected) return;

  const { vvOffsetTop, effectiveVisibleHeight } = metrics;
  if (effectiveVisibleHeight <= 80) return;

  // Keep enough space below input so real-time typing AND nearby action buttons stay visible
  const bottomClearance = Math.min(88, Math.max(36, Math.round(effectiveVisibleHeight * 0.22)));
  const topClearance = vvOffsetTop + Math.min(72, Math.max(20, Math.round(effectiveVisibleHeight * 0.14)));
  const safeBottom = vvOffsetTop + effectiveVisibleHeight - bottomClearance;

  const initialRect = el.getBoundingClientRect();
  if (initialRect.height === 0 && initialRect.width === 0) return;

  // Already comfortably inside the safe upper-middle visible band
  if (initialRect.top >= topClearance && initialRect.bottom <= safeBottom) {
    return;
  }

  const desiredTop = Math.max(
    topClearance,
    Math.min(
      safeBottom - initialRect.height - 6,
      vvOffsetTop + Math.round(effectiveVisibleHeight * 0.28)
    )
  );

  const ancestors = getScrollAncestors(el);

  for (const parent of ancestors) {
    const rect = el.getBoundingClientRect();
    if (rect.top >= topClearance && rect.bottom <= safeBottom) {
      break;
    }

    let delta = 0;
    if (rect.bottom > safeBottom) {
      // Element is too low (covered by keyboard or near bottom) -> scroll down (positive delta)
      delta = rect.top - desiredTop;
      if (rect.bottom - delta > safeBottom) {
        delta = rect.bottom - safeBottom;
      }
    } else if (rect.top < topClearance) {
      // Element is hidden under sticky top bar -> scroll up (negative delta)
      delta = rect.top - topClearance;
    }

    if (Math.abs(delta) < 2) continue;

    if (parent === window) {
      const currentY =
        window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const nextY = Math.max(0, Math.min(maxScroll, currentY + delta));
      window.scrollTo({ top: nextY, behavior: 'auto' });
    } else if (parent instanceof HTMLElement) {
      const parentRect = parent.getBoundingClientRect();
      // Keep element inside the parent's own visible viewport slice as well
      const maxScroll = Math.max(0, parent.scrollHeight - parent.clientHeight);
      const prevTop = parent.scrollTop;
      const maxUpDelta = Math.max(0, rect.top - (parentRect.top + 12));
      const clampedDelta =
        delta > 0 && rect.top - delta < parentRect.top + 12
          ? Math.min(delta, maxUpDelta)
          : delta;
      const nextTop = Math.max(0, Math.min(maxScroll, prevTop + clampedDelta));
      if (Math.abs(nextTop - prevTop) >= 1) {
        parent.scrollTop = nextTop;
      }
    }
  }
}

/**
 * Global mobile virtual keyboard manager across ALL screens, forms, and modals:
 * - Supports both `interactive-widget=resizes-content` (layout resize) and overlay keyboards (`visualViewport` shrink or non-resizing WebView APKs).
 * - Multi-ancestor scroll guarantees nested modal inputs & cart fields never stay hidden behind the keyboard.
 * - Sets CSS variables (`--vv-height`, `--vv-offset-top`, `--keyboard-inset`, `--keyboard-scroll-pad`) and classes (`keyboard-open`, `keyboard-input-focused`).
 */
export function useMobileKeyboardManager() {
  useEffect(() => {
    let baselineHeight = window.innerHeight;
    let baselineWidth = window.innerWidth;

    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeRaf: number | null = null;
    let focusTimers: Array<ReturnType<typeof setTimeout>> = [];

    const clearFocusTimers = () => {
      focusTimers.forEach((t) => clearTimeout(t));
      focusTimers = [];
    };

    const computeAndApplyState = (): ViewportMetrics => {
      const activeEl = document.activeElement;
      const inputFocused = isKeyboardInput(activeEl);
      const touchMobile = isLikelyTouchMobile();

      // Update baseline when window width changes (orientation) or when no keyboard input is active
      if (Math.abs(window.innerWidth - baselineWidth) > 40) {
        baselineWidth = window.innerWidth;
        baselineHeight = window.innerHeight;
      } else if (!inputFocused && window.innerHeight >= baselineHeight - 20) {
        baselineHeight = window.innerHeight;
      } else if (window.innerHeight > baselineHeight) {
        baselineHeight = window.innerHeight;
      }

      const vv = window.visualViewport;
      const vvHeight = vv ? vv.height : window.innerHeight;
      const vvOffsetTop = vv ? vv.offsetTop : 0;

      const rawOverlayInset = vv
        ? Math.max(0, window.innerHeight - (vvHeight + vvOffsetTop))
        : 0;
      const windowShrankHeight = Math.max(0, baselineHeight - window.innerHeight);

      const measuredKeyboardOpen = rawOverlayInset > 110 || windowShrankHeight > 110;
      const usingFallbackEstimate =
        !measuredKeyboardOpen && inputFocused && touchMobile;

      const fallbackKbHeight = usingFallbackEstimate
        ? Math.round(Math.max(240, Math.min(360, vvHeight * 0.42)))
        : 0;

      const effectiveVisibleHeight = usingFallbackEstimate
        ? Math.max(200, vvHeight - fallbackKbHeight)
        : vvHeight;

      const root = document.documentElement;
      const isOpen = measuredKeyboardOpen || (inputFocused && touchMobile);

      if (inputFocused && touchMobile) {
        root.classList.add('keyboard-input-focused');
      } else {
        root.classList.remove('keyboard-input-focused');
      }

      if (isOpen) {
        root.classList.add('keyboard-open');
        const effectiveInset =
          rawOverlayInset > 110
            ? Math.round(rawOverlayInset)
            : usingFallbackEstimate
            ? fallbackKbHeight
            : 0;
        const measuredKb = Math.max(rawOverlayInset, windowShrankHeight, fallbackKbHeight);

        root.style.setProperty('--keyboard-height', `${Math.round(measuredKb)}px`);
        root.style.setProperty('--keyboard-inset', `${effectiveInset}px`);
        root.style.setProperty('--vv-height', `${Math.round(effectiveVisibleHeight)}px`);
        root.style.setProperty('--vv-offset-top', `${Math.round(vvOffsetTop)}px`);
        root.style.setProperty(
          '--keyboard-scroll-pad',
          rawOverlayInset > 110
            ? `${Math.round(rawOverlayInset + 96)}px`
            : usingFallbackEstimate
            ? `${fallbackKbHeight + 72}px`
            : '96px'
        );
      } else {
        root.classList.remove('keyboard-open');
        root.style.setProperty('--keyboard-height', '0px');
        root.style.setProperty('--keyboard-inset', '0px');
        root.style.setProperty('--vv-height', '100dvh');
        root.style.setProperty('--vv-offset-top', '0px');
        root.style.setProperty('--keyboard-scroll-pad', '0px');
      }

      return {
        vvHeight,
        vvOffsetTop,
        rawOverlayInset,
        windowShrankHeight,
        effectiveVisibleHeight,
        usingFallbackEstimate,
      };
    };

    const syncFocusedInput = (el?: HTMLElement | null) => {
      const metrics = computeAndApplyState();
      const target = el ?? (document.activeElement as HTMLElement | null);
      if (isKeyboardInput(target)) {
        scrollElementAboveKeyboard(target, metrics);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!isKeyboardInput(target)) return;

      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
      clearFocusTimers();

      // Apply state synchronously right away so padding/modal height exist before first scroll check
      computeAndApplyState();

      // Scroll promptly and re-verify as Android/iOS keyboard animates up (80ms - 550ms)
      focusTimers.push(setTimeout(() => syncFocusedInput(target), 60));
      focusTimers.push(setTimeout(() => syncFocusedInput(target), 220));
      focusTimers.push(setTimeout(() => syncFocusedInput(target), 400));
      focusTimers.push(setTimeout(() => syncFocusedInput(target), 600));
    };

    const handleFocusOut = () => {
      if (blurTimer) clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        const active = document.activeElement;
        if (!isKeyboardInput(active)) {
          clearFocusTimers();
          computeAndApplyState();
        }
      }, 180);
    };

    const handleViewportChange = () => {
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        syncFocusedInput();
      });
    };

    const handleTextAreaInput = (e: Event) => {
      if (e.target instanceof HTMLTextAreaElement) {
        syncFocusedInput(e.target);
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('input', handleTextAreaInput, true);
    window.addEventListener('resize', handleViewportChange);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    return () => {
      clearFocusTimers();
      if (blurTimer) clearTimeout(blurTimer);
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);

      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('input', handleTextAreaInput, true);
      window.removeEventListener('resize', handleViewportChange);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }

      const root = document.documentElement;
      root.classList.remove('keyboard-open', 'keyboard-input-focused');
      root.style.removeProperty('--keyboard-height');
      root.style.removeProperty('--keyboard-inset');
      root.style.removeProperty('--vv-height');
      root.style.removeProperty('--vv-offset-top');
      root.style.removeProperty('--keyboard-scroll-pad');
    };
  }, []);
}
