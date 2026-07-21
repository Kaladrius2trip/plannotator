import { describe, expect, test } from "bun:test";
import {
  DEFAULT_HANDOFF_MESSAGE,
  normalizeWorkflowOptions,
  resolveApprovalHandoff,
} from "./workflow";

const opts = (agentRouting?: unknown) =>
  normalizeWorkflowOptions({ workflow: "user-managed", agentRouting });

describe("resolveApprovalHandoff", () => {
  test("explicit UI agent choice wins over routing", () => {
    const handoff = resolveApprovalHandoff({
      invokingAgent: "prometheus",
      uiAgentSwitch: "build",
      options: opts({ prometheus: { executor: "atlas" } }),
    });
    expect(handoff).toEqual({ targetAgent: "build", message: DEFAULT_HANDOFF_MESSAGE });
  });

  test("explicit UI disabled always stays, even with routing", () => {
    const handoff = resolveApprovalHandoff({
      invokingAgent: "prometheus",
      uiAgentSwitch: "disabled",
      options: opts({ prometheus: { executor: "atlas" } }),
    });
    expect(handoff.targetAgent).toBeUndefined();
  });

  test("routing executor 'self' stays on invoking agent", () => {
    const handoff = resolveApprovalHandoff({
      invokingAgent: "sisyphus",
      uiAgentSwitch: undefined,
      options: opts({ sisyphus: { executor: "self" } }),
    });
    expect(handoff.targetAgent).toBeUndefined();
  });

  test("routing executor equal to invoking agent stays", () => {
    const handoff = resolveApprovalHandoff({
      invokingAgent: "sisyphus",
      uiAgentSwitch: undefined,
      options: opts({ sisyphus: { executor: "sisyphus" } }),
    });
    expect(handoff.targetAgent).toBeUndefined();
  });

  test("routing planner -> executor switches with custom message", () => {
    const handoff = resolveApprovalHandoff({
      invokingAgent: "prometheus",
      uiAgentSwitch: undefined,
      options: opts({ prometheus: { executor: "atlas", message: "/start-work" } }),
    });
    expect(handoff).toEqual({ targetAgent: "atlas", message: "/start-work" });
  });

  test("routing without message uses default handoff message", () => {
    const handoff = resolveApprovalHandoff({
      invokingAgent: "prometheus",
      uiAgentSwitch: undefined,
      options: opts({ prometheus: { executor: "atlas" } }),
    });
    expect(handoff).toEqual({ targetAgent: "atlas", message: DEFAULT_HANDOFF_MESSAGE });
  });

  test("no routing and no UI choice stays (no legacy build fallback)", () => {
    const handoff = resolveApprovalHandoff({
      invokingAgent: "sisyphus",
      uiAgentSwitch: undefined,
      options: opts(),
    });
    expect(handoff.targetAgent).toBeUndefined();
  });

  test("invalid routing shapes are ignored", () => {
    const options = opts({
      "": { executor: "atlas" },
      bad1: "nope",
      bad2: { executor: 42 },
      bad3: { executor: "  " },
      ok: { executor: "atlas", message: 7 },
    });
    expect(Object.keys(options.agentRouting)).toEqual(["ok"]);
    expect(options.agentRouting.ok).toEqual({ executor: "atlas" });
  });
});
