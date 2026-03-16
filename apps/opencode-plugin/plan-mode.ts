import { existsSync, mkdirSync, readFileSync, realpathSync } from "fs";
import { homedir } from "os";
import path from "path";

const PLAN_DIR_SEGMENTS = [".plannotator", "session-plans", "opencode"];

// ── Directory ─────────────────────────────────────────────────────────────

export function getPlanDirectory(homeDirectory: string = homedir()): string {
  const dir = path.join(homeDirectory, ...PLAN_DIR_SEGMENTS);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ── Path validation ───────────────────────────────────────────────────────

export type ValidatePlanPathResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

export function validatePlanPath(
  filePath: string,
  planDir: string,
): ValidatePlanPathResult {
  // 1. Must be absolute
  if (!path.isAbsolute(filePath)) {
    return { ok: false, error: `Path must be absolute. Got: ${filePath}` };
  }

  // 2. Must be inside the plan directory (canonical comparison)
  try {
    const canonicalDir = realpathSync(planDir);
    const canonicalFile = realpathSync(path.dirname(filePath)) + path.sep + path.basename(filePath);
    if (!canonicalFile.startsWith(canonicalDir + path.sep) && canonicalFile !== canonicalDir) {
      return {
        ok: false,
        error: `Plan file must be inside ${planDir}. Got: ${filePath}`,
      };
    }
  } catch {
    // If the file's parent dir doesn't exist, realpath will throw.
    // Check if it's at least structurally inside the plan dir.
    const normalizedFile = path.normalize(filePath);
    const normalizedDir = path.normalize(planDir);
    if (!normalizedFile.startsWith(normalizedDir + path.sep)) {
      return {
        ok: false,
        error: `Plan file must be inside ${planDir}. Got: ${filePath}`,
      };
    }
  }

  // 3. Must exist
  if (!existsSync(filePath)) {
    return {
      ok: false,
      error: `No plan file found at ${filePath}. Create the file first, then call submit_plan.`,
    };
  }

  // 4. Must be readable
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch (err) {
    return {
      ok: false,
      error: `Could not read plan file at ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 5. Must have non-whitespace content
  if (!content.trim()) {
    return {
      ok: false,
      error: `Plan file at ${filePath} is empty. Write your plan content first, then call submit_plan.`,
    };
  }

  return { ok: true, content };
}

// ── Prompt stripping ──────────────────────────────────────────────────────

function shouldStripPlanModeLine(line: string): boolean {
  const normalized = line.trim().toLowerCase();
  return normalized.includes("strictly forbidden: any file edits")
    || normalized.includes("your plan at ")
    || normalized.includes("plan file already exists at ")
    || normalized.includes(".opencode/plans/")
    || normalized.includes("plan_exit")
    || (normalized.includes("agent's conversation") && normalized.includes("not on disk"));
}

function cleanupSystemEntry(entry: string): string {
  return entry
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripConflictingPlanModeRules(systemEntries: string[]): string[] {
  return systemEntries
    .map((entry) =>
      cleanupSystemEntry(
        entry
          .split("\n")
          .filter((line) => !shouldStripPlanModeLine(line))
          .join("\n"),
      ),
    )
    .filter(Boolean);
}
