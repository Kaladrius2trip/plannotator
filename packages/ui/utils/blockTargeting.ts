/**
 * Block Targeting — resolves which element to annotate in pinpoint mode.
 *
 * Walks from the element under the cursor upward through the block tree
 * to find the most specific targetable element (inline, cell, or block).
 */

/** Elements that should never be targeted */
const SKIP_SELECTORS = [
  '.annotation-toolbar',
  '.annotation-highlight',
  'mark[data-bind-id]',
  'button',
  '[data-pinpoint-ignore]',
].join(',');

/** Inline elements that are individually targetable within a block */
const INLINE_TARGETS = new Set(['STRONG', 'EM', 'A']);

/** Table cell elements */
const CELL_TARGETS = new Set(['TD', 'TH']);

export interface PinpointTarget {
  /** The DOM element to highlight and select */
  element: HTMLElement;
  /** The data-block-id of the parent block */
  blockId: string;
  /** Human-readable label for the hover tooltip */
  label: string;
  /** Whether this is a code block (needs special annotation path) */
  isCodeBlock: boolean;
}

/**
 * Given a mousemove/click target element, find the best annotation target
 * within the viewer container.
 */
export function resolvePinpointTarget(
  target: HTMLElement,
  container: HTMLElement,
): PinpointTarget | null {
  // Skip toolbar, buttons, existing annotations
  if (target.closest(SKIP_SELECTORS)) return null;
  if (!container.contains(target)) return null;

  // Find the parent block
  const blockEl = target.closest('[data-block-id]') as HTMLElement | null;
  if (!blockEl || !container.contains(blockEl)) return null;

  const blockId = blockEl.getAttribute('data-block-id')!;

  // Skip hr (no text content)
  if (blockEl.tagName === 'HR') return null;

  // Code block detection: pre > code.hljs
  const codeEl = blockEl.querySelector('pre > code.hljs');
  if (codeEl && (target === codeEl || codeEl.contains(target) || target.closest('pre'))) {
    return {
      element: blockEl,
      blockId,
      label: getCodeBlockLabel(blockEl),
      isCodeBlock: true,
    };
  }

  // Inline code (not inside a code block) — target the <code> element
  if (target.tagName === 'CODE' && !target.classList.contains('hljs')) {
    const text = target.textContent?.trim() || '';
    if (text) {
      return {
        element: target,
        blockId,
        label: `code: \`${truncate(text, 30)}\``,
        isCodeBlock: false,
      };
    }
  }

  // Inline elements: strong, em, a
  if (INLINE_TARGETS.has(target.tagName)) {
    const text = target.textContent?.trim() || '';
    if (text) {
      return {
        element: target,
        blockId,
        label: getInlineLabel(target, text),
        isCodeBlock: false,
      };
    }
  }

  // Table cells
  if (CELL_TARGETS.has(target.tagName)) {
    return {
      element: target,
      blockId,
      label: 'table cell',
      isCodeBlock: false,
    };
  }
  // Check if inside a table cell
  const cell = target.closest('td, th') as HTMLElement | null;
  if (cell && blockEl.contains(cell)) {
    return {
      element: cell,
      blockId,
      label: 'table cell',
      isCodeBlock: false,
    };
  }

  // List item — target the content span (second child), not the bullet
  if (blockEl.querySelector('.select-none')) {
    // This is a list item with a bullet. Find the content span.
    const contentSpan = blockEl.children[1] as HTMLElement | undefined;
    if (contentSpan && (contentSpan === target || contentSpan.contains(target))) {
      return {
        element: contentSpan,
        blockId,
        label: getListItemLabel(contentSpan),
        isCodeBlock: false,
      };
    }
    // Clicked on the bullet area — still target the content span
    if (contentSpan) {
      return {
        element: contentSpan,
        blockId,
        label: getListItemLabel(contentSpan),
        isCodeBlock: false,
      };
    }
  }

  // Fall back to the full block
  return {
    element: blockEl,
    blockId,
    label: getBlockLabel(blockEl),
    isCodeBlock: false,
  };
}

function getInlineLabel(el: HTMLElement, text: string): string {
  switch (el.tagName) {
    case 'STRONG': return `bold: "${truncate(text, 30)}"`;
    case 'EM': return `italic: "${truncate(text, 30)}"`;
    case 'A': return `link: "${truncate(text, 25)}"`;
    default: return truncate(text, 30);
  }
}

function getBlockLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const text = el.textContent?.trim() || '';

  if (el.dataset.blockType === 'heading' || /^h[1-6]$/.test(tag)) {
    return `heading: "${truncate(text, 35)}"`;
  }
  if (tag === 'blockquote') return `blockquote: "${truncate(text, 30)}"`;
  if (tag === 'p') return text ? `paragraph: "${truncate(text, 35)}"` : 'paragraph';
  return truncate(text, 35) || tag;
}

function getListItemLabel(contentSpan: HTMLElement): string {
  const text = contentSpan.textContent?.trim() || '';
  return text ? `list item: "${truncate(text, 30)}"` : 'list item';
}

function getCodeBlockLabel(blockEl: HTMLElement): string {
  const codeEl = blockEl.querySelector('code');
  const lang = codeEl?.className?.match(/language-(\S+)/)?.[1];
  return lang ? `code block (${lang})` : 'code block';
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text;
}
