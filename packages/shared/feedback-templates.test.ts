import { describe, test, expect } from "bun:test";
import {
  planDenyFeedback,
  codeReviewFeedback,
  codeReviewApproved,
  annotateFeedback,
} from "./feedback-templates";

describe("feedback-templates", () => {
  // ── Plan deny ────────────────────────────────────────────────────────

  describe("planDenyFeedback", () => {
    test("defaults to ExitPlanMode tool name", () => {
      const result = planDenyFeedback("fix the auth section");
      expect(result).toContain("ExitPlanMode");
      expect(result).toContain("fix the auth section");
    });

    test("uses provided tool name for each integration", () => {
      const tools = ["ExitPlanMode", "submit_plan", "exit_plan_mode"] as const;
      for (const tool of tools) {
        const result = planDenyFeedback("feedback", tool);
        expect(result).toContain(`calling ${tool} again`);
      }
    });

    test("all integrations produce identical structure", () => {
      const normalize = (s: string) =>
        s.replace(/ExitPlanMode|submit_plan|exit_plan_mode/g, "TOOL");

      const hook = normalize(planDenyFeedback("same feedback", "ExitPlanMode"));
      const opencode = normalize(planDenyFeedback("same feedback", "submit_plan"));
      const pi = normalize(planDenyFeedback("same feedback", "exit_plan_mode"));

      expect(hook).toBe(opencode);
      expect(opencode).toBe(pi);
    });

    test("includes directive framing keywords", () => {
      const result = planDenyFeedback("feedback");
      expect(result).toContain("YOUR PLAN WAS NOT APPROVED");
      expect(result).toContain("MUST");
      expect(result).toContain("ALL");
      expect(result).toContain("Edit tool");
    });

    test("falls back when feedback is empty", () => {
      const result = planDenyFeedback("");
      expect(result).toContain("Plan changes requested");
    });
  });

  // ── Code review ──────────────────────────────────────────────────────

  describe("codeReviewFeedback", () => {
    test("wraps feedback with directive", () => {
      const result = codeReviewFeedback("line 42 should be const");
      expect(result).toContain("line 42 should be const");
      expect(result).toContain("MUST address");
    });
  });

  describe("codeReviewApproved", () => {
    test("returns LGTM message", () => {
      expect(codeReviewApproved()).toContain("no changes requested");
    });
  });

  // ── Annotate ─────────────────────────────────────────────────────────

  describe("annotateFeedback", () => {
    test("includes file path when provided", () => {
      const result = annotateFeedback("fix typo", "/src/readme.md");
      expect(result).toContain("File: /src/readme.md");
      expect(result).toContain("fix typo");
      expect(result).toContain("MUST address");
    });

    test("omits file path when not provided", () => {
      const result = annotateFeedback("fix typo");
      expect(result).not.toContain("File:");
      expect(result).toContain("fix typo");
    });
  });
});
