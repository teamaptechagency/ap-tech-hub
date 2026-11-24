(() => {
  'use strict';
  if (!document.body.hasAttribute('data-ap-cursor')) return;

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = window.matchMedia('(forced-colors: active)');
  const root = document.documentElement;
  const svgNS = 'http://www.w3.org/2000/svg';
  // A slim, familiar pointer with a permanent top-left lean, not a spinning logo.
  // Its tip (3, 2) is the pointer hotspot; the branded shape is about 18 x 28px.
  const pointerPath = 'M3 2L17.8 16.8L11.5 16.4L14.8 24.9L11.4 26.2L8.2 17.8L3 22Z';
  const clickTargets = 'a[href], button, summary, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]';
  const nativeTargets = 'input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable], iframe, video[controls], audio[controls], [draggable="true"], [disabled], [aria-disabled="true"], [data-native-cursor], [inert]';
  const textInputTypes = new Set(['text', 'email', 'search', 'url', 'tel', 'password']);

  const cursor = document.createElement('div');
  cursor.className = 'ap-logo-cursor';
  cursor.dataset.mode = 'native';
  cursor.setAttribute('aria-hidden', 'true');
  const mark = document.createElementNS(svgNS, 'svg');
  mark.classList.add('ap-cursor-mark');
  mark.setAttribute('viewBox', '0 0 24 32');
  mark.setAttribute('focusable', 'false');

  function addPath(fill, stroke, width) {
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', pointerPath);
    path.setAttribute('fill', fill);
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', String(width));
    path.setAttribute('stroke-linejoin', 'round');
    mark.appendChild(path);
  }

  // A fine light rim and Gold accent keep the black outline readable on dark areas.
  addPath('none', '#F8F9F1', 3.4);
  addPath('none', '#C5A46D', 2.5);
  addPath('#556B2F', '#000000', 1.25);
  cursor.appendChild(mark);
  document.body.appendChild(cursor);

  let x = 0;
  let y = 0;
  let mode = 'native';
  let inside = false;
  let tracking = false;
  let dragging = false;
  let selectingText = false;
  let scrollFrame = 0;
  let modalOpen = Boolean(document.querySelector('dialog[open]'));

  function available() {
    return finePointer.matches && !reducedMotion.matches && !forcedColors.matches && !modalOpen && !dragging;
  }

  function setMode(next) {
    if (mode === next) return;
    mode = next;
    cursor.dataset.mode = next;
    root.classList.toggle('ap-cursor-active', next === 'pointer');
    root.classList.toggle('ap-cursor-text', next === 'text');
    if (next !== 'pointer') {
      cursor.dataset.hover = 'false';
      cursor.dataset.pressed = 'false';
    }
  }

  function reset() {
    inside = false;
    tracking = false;
    selectingText = false;
    setMode('native');
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  }

  function isResizeHandle(element) {
    if (!(element instanceof HTMLTextAreaElement)) return false;
    if (getComputedStyle(element).resize === 'none') return false;
    const rect = element.getBoundingClientRect();
    return y >= rect.bottom - 19 && x >= rect.right - 19;
  }

  function isEditableText(element) {
    if (element.matches('[disabled], [aria-disabled="true"], [data-native-cursor]')) return false;
    if (element instanceof HTMLTextAreaElement) return !isResizeHandle(element);
    if (element instanceof HTMLInputElement) return textInputTypes.has(element.type);
    return element.isContentEditable;
  }

  function overSelectableText() {
    // A caret hit alone can snap to a distant paragraph. Verify its actual glyph
    // rectangles so blank space keeps the arrow, and no selection is changed.
    let node;
    let offset;
    if (!document.caretPositionFromPoint && !document.caretRangeFromPoint) return null;
    try {
      if (document.caretPositionFromPoint) {
        const caret = document.caretPositionFromPoint(x, y);
        node = caret?.offsetNode;
        offset = caret?.offset;
      } else if (document.caretRangeFromPoint) {
        const caret = document.caretRangeFromPoint(x, y);
        node = caret?.startContainer;
        offset = caret?.startOffset;
      }
      if (!node || node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return false;
      const parent = node.parentElement;
      if (!parent || parent.closest('.ap-logo-cursor, [inert]')) return false;
      if (getComputedStyle(parent).userSelect === 'none') return false;
      const range = document.createRange();
      range.setStart(node, Math.max(0, offset - 1));
      range.setEnd(node, Math.min(node.textContent.length, offset + 1));
      return [...range.getClientRects()].some(rect =>
        rect.width > 0 && x >= rect.left - 1 && x <= rect.right + 1 &&
        y >= rect.top && y <= rect.bottom
      );
    } catch {
      // If this browser cannot supply a text hit, leave its cursor in charge.
      return null;
    }
  }

  function refreshTarget(target) {
    if (!inside || !tracking || !available() || !(target instanceof Element)) {
      setMode('native');
      return;
    }
    const native = target.closest(nativeTargets);
    if (native) {
      const blocked = target.closest('[disabled], [aria-disabled="true"], [data-native-cursor], [inert], [draggable="true"]');
      const text = !blocked && isEditableText(native);
      setMode(text ? 'text' : 'native');
      return;
    }
    if (selectingText) {
      setMode('text');
      return;
    }
    const clickable = Boolean(target.closest(clickTargets));
    if (clickable) {
      setMode('pointer');
      cursor.dataset.hover = 'true';
      return;
    }
    const text = overSelectableText();
    setMode(text === null ? 'native' : text ? 'text' : 'pointer');
    if (mode === 'pointer') cursor.dataset.hover = 'false';
  }

  function move(event) {
    if (event.pointerType !== 'mouse') {
      reset();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    inside = true;
    tracking = true;
    cursor.style.transform = `translate3d(${x - 3}px, ${y - 2}px, 0)`;
    refreshTarget(event.target);
  }

  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerover', move, { passive: true });
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) reset();
  }, { passive: true });
  document.addEventListener('pointerdown', event => {
    move(event);
    if (event.button === 0 && mode === 'text') selectingText = true;
    if (mode === 'pointer') cursor.dataset.pressed = 'true';
  }, { passive: true });
  document.addEventListener('pointerup', event => {
    selectingText = false;
    cursor.dataset.pressed = 'false';
    move(event);
  }, { passive: true });
  document.addEventListener('pointercancel', reset, { passive: true });
  document.addEventListener('keydown', reset);
  document.addEventListener('dragstart', () => {
    dragging = true;
    reset();
  });
  document.addEventListener('dragend', () => {
    dragging = false;
    reset();
  });
  document.addEventListener('contextmenu', reset);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) reset();
  });
  document.addEventListener('scroll', () => {
    if (!inside || !tracking || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      refreshTarget(document.elementFromPoint(x, y));
    });
  }, { passive: true, capture: true });

  // Browser top-layer dialogs, keyboard use and accessibility modes stay native.
  new MutationObserver(() => {
    modalOpen = Boolean(document.querySelector('dialog[open]'));
    if (modalOpen) reset();
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });

  for (const query of [finePointer, forcedColors, reducedMotion]) query.addEventListener('change', reset);
})();
