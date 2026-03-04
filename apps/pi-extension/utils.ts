/**
 * Plannotator Pi extension utilities.
 *
 * Inlined versions of bash safety checks and checklist parsing.
 * (No access to pi-mono's plan-mode/utils at runtime.)
 */

// ── Bash Safety ──────────────────────────────────────────────────────────

const DESTRUCTIVE_PATTERNS = [
  /\brm\b/i, /\brmdir\b/i, /\bmv\b/i, /\bcp\b/i, /\bmkdir\b/i,
  /\btouch\b/i, /\bchmod\b/i, /\bchown\b/i, /\bchgrp\b/i, /\bln\b/i,
  /\btee\b/i, /\btruncate\b/i, /\bdd\b/i, /\bshred\b/i,
  /(^|[^<])>(?!>)/, />>/,
  /\bnpm\s+(install|uninstall|update|ci|link|publish)/i,
  /\byarn\s+(add|remove|install|publish)/i,
  /\bpnpm\s+(add|remove|install|publish)/i,
  /\bpip\s+(install|uninstall)/i,
  /\bapt(-get)?\s+(install|remove|purge|update|upgrade)/i,
  /\bbrew\s+(install|uninstall|upgrade)/i,
  /\bgit\s+(add|commit|push|pull|merge|rebase|reset|checkout|branch\s+-[dD]|stash|cherry-pick|revert|tag|init|clone)/i,
  /\bsudo\b/i, /\bsu\b/i, /\bkill\b/i, /\bpkill\b/i, /\bkillall\b/i,
  /\breboot\b/i, /\bshutdown\b/i,
  /\bsystemctl\s+(start|stop|restart|enable|disable)/i,
  /\bservice\s+\S+\s+(start|stop|restart)/i,
  /\b(vim?|nano|emacs|code|subl)\b/i,
];

export function isDestructiveCommand(command: string): boolean {
  // Strip safe fd redirects so `curl ... 2>/dev/null` and `2>&1` pass
  const normalized = command
    .replace(/\s+\d*>\s*\/dev\/null/g, "")
    .replace(/\s+\d*>&\d+/g, "")
    .replace(/\s+&>\s*\/dev\/null/g, "");

  return DESTRUCTIVE_PATTERNS.some((p) => p.test(normalized));
}

// ── Checklist Parsing ────────────────────────────────────────────────────

export interface ChecklistItem {
  /** 1-based step number, compatible with markCompletedSteps/extractDoneSteps. */
  step: number;
  text: string;
  completed: boolean;
}

/**
 * Parse standard markdown checkboxes from file content.
 *
 * Matches lines like:
 *   - [ ] Step description
 *   - [x] Completed step
 *   * [ ] Alternative bullet
 */
export function parseChecklist(content: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const pattern = /^[-*]\s*\[([ xX])\]\s+(.+)$/gm;

  for (const match of content.matchAll(pattern)) {
    const completed = match[1] !== " ";
    const text = match[2].trim();
    if (text.length > 0) {
      items.push({ step: items.length + 1, text, completed });
    }
  }
  return items;
}

// ── Progress Tracking ────────────────────────────────────────────────────

export function extractDoneSteps(message: string): number[] {
  const steps: number[] = [];
  for (const match of message.matchAll(/\[DONE:(\d+)\]/gi)) {
    const step = Number(match[1]);
    if (Number.isFinite(step)) steps.push(step);
  }
  return steps;
}

export function markCompletedSteps(text: string, items: ChecklistItem[]): number {
  const doneSteps = extractDoneSteps(text);
  for (const step of doneSteps) {
    const item = items.find((t) => t.step === step);
    if (item) item.completed = true;
  }
  return doneSteps.length;
}
