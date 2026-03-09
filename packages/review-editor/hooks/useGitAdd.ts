import { useState, useCallback, useMemo } from 'react';

interface UseGitAddOptions {
  activeDiffBase: string;
  onFileViewed: (filePath: string) => void;
}

interface UseGitAddReturn {
  stagedFiles: Set<string>;
  stagingFile: string | null;
  canStageFiles: boolean;
  stageFile: (filePath: string) => Promise<void>;
  resetStagedFiles: () => void;
  stageError: string | null;
}

const STAGEABLE_DIFF_TYPES = new Set(['uncommitted', 'unstaged']);

export function useGitAdd({ activeDiffBase, onFileViewed }: UseGitAddOptions): UseGitAddReturn {
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
  const [stagingFile, setStagingFile] = useState<string | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);

  const canStageFiles = useMemo(() => STAGEABLE_DIFF_TYPES.has(activeDiffBase), [activeDiffBase]);

  const stageFile = useCallback(async (filePath: string) => {
    const isUndo = stagedFiles.has(filePath);
    setStagingFile(filePath);
    setStageError(null);

    try {
      const res = await fetch('/api/git-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, undo: isUndo }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(data.error || 'Failed');
      }

      setStagedFiles(prev => {
        const next = new Set(prev);
        if (isUndo) {
          next.delete(filePath);
        } else {
          next.add(filePath);
        }
        return next;
      });

      // Auto-mark as viewed on stage (not on unstage)
      if (!isUndo) {
        onFileViewed(filePath);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Git add failed';
      setStageError(message);
      setTimeout(() => setStageError(null), 3000);
    } finally {
      setStagingFile(null);
    }
  }, [stagedFiles, onFileViewed]);

  const resetStagedFiles = useCallback(() => {
    setStagedFiles(new Set());
    setStageError(null);
  }, []);

  return { stagedFiles, stagingFile, canStageFiles, stageFile, resetStagedFiles, stageError };
}
