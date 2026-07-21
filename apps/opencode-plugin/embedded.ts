import { recoverNativeFetchConstructors } from "./fetch-shim";
import {
  waitForPlanReviewCloseDelay,
  waitForPlanReviewDecision,
} from "@plannotator/shared/plan-review-lifecycle";

export interface EmbeddedPlanReviewInput {
  client: any;
  planContent: string;
  sharingEnabled: boolean;
  shareBaseUrl?: string;
  pasteApiUrl?: string;
  htmlContent: string;
  timeoutSeconds: number | null;
  /** AFK auto-approve countdown in seconds (null/0 disables) */
  afkSeconds?: number | null;
  abortSignal: AbortSignal;
  logReady: (url: string, isRemote: boolean, port: number) => void;
}

export interface EmbeddedPlanReviewResult {
  approved: boolean;
  feedback?: string;
  savedPath?: string;
  agentSwitch?: string;
  saveOnly?: boolean;
}

async function loadPlanServer() {
  recoverNativeFetchConstructors();
  return await import("@plannotator/server");
}

async function loadCommandHandlers() {
  recoverNativeFetchConstructors();
  return await import("./commands");
}

export async function runEmbeddedPlanReview(
  input: EmbeddedPlanReviewInput,
): Promise<EmbeddedPlanReviewResult> {
  input.abortSignal.throwIfAborted();
  const { startPlannotatorServer, handleServerReady } = await loadPlanServer();
  const server = await startPlannotatorServer({
    plan: input.planContent,
    origin: "opencode",
    sharingEnabled: input.sharingEnabled,
    shareBaseUrl: input.shareBaseUrl,
    pasteApiUrl: input.pasteApiUrl,
    htmlContent: input.htmlContent,
    opencodeClient: input.client,
    afkSeconds: input.afkSeconds && input.afkSeconds > 0 ? input.afkSeconds : undefined,
    onReady: async (url, isRemote, port) => {
      await handleServerReady(url, isRemote, port);
      input.logReady(url, isRemote, port);
    },
  });

  const timeoutMs = input.timeoutSeconds === null ? null : input.timeoutSeconds * 1000;
  try {
    // AFK auto-approve: if the browser never loads the UI within afkSeconds,
    // the user is away — approve automatically. Once the UI is viewed, the
    // normal decision flow owns the outcome (the UI runs its own countdown).
    if (input.afkSeconds && input.afkSeconds > 0) {
      let afkTimer: ReturnType<typeof setTimeout> | undefined;
      let onAbort: (() => void) | undefined;
      const raced = await new Promise<"viewing" | "afk" | "abort">((resolve) => {
        onAbort = () => resolve("abort");
        input.abortSignal.addEventListener("abort", onAbort, { once: true });
        afkTimer = setTimeout(() => resolve("afk"), input.afkSeconds! * 1000);
        void server.waitForViewing().then(() => resolve("viewing"));
      });
      clearTimeout(afkTimer);
      if (onAbort) input.abortSignal.removeEventListener("abort", onAbort);
      input.abortSignal.throwIfAborted();
      if (raced === "afk") {
        return { approved: true };
      }
    }

    const result = await waitForPlanReviewDecision({
      waitForDecision: server.waitForDecision,
      timeoutMs,
      timeoutResult: {
        approved: false,
        feedback: `[Plannotator] No response within ${input.timeoutSeconds} seconds. Port released automatically. Please call submit_plan again.`,
      },
      signal: input.abortSignal,
    });

    await waitForPlanReviewCloseDelay(1500, input.abortSignal);
    return result;
  } finally {
    await server.stop();
  }
}

export async function handleEmbeddedCommand(
  command: string,
  event: any,
  deps: {
    client: any;
    htmlContent: string;
    reviewHtmlContent: string;
    getSharingEnabled: () => Promise<boolean>;
    getShareBaseUrl: () => string | undefined;
    getPasteApiUrl: () => string | undefined;
    directory?: string;
  },
): Promise<{ feedback?: string | null }> {
  const {
    handleReviewCommand,
    handleAnnotateCommand,
    handleAnnotateLastCommand,
  } = await loadCommandHandlers();

  if (command === "plannotator-last") {
    return { feedback: await handleAnnotateLastCommand(event, deps) };
  }

  if (command === "plannotator-annotate") {
    await handleAnnotateCommand(event, deps);
    return {};
  }

  if (command === "plannotator-review") {
    await handleReviewCommand(event, deps);
    return {};
  }

  return {};
}
