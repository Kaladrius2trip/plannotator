/**
 * Agent Switch Settings Utility
 *
 * Manages settings for automatic agent switching after plan approval.
 * Supports built-in agents (build), disabled, or custom agent names.
 *
 * Uses cookies (not localStorage) because each hook invocation runs on a
 * random port, and localStorage is scoped by origin including port.
 */

import { storage } from "./storage";

const STORAGE_KEY = "plannotator-agent-switch";
const CUSTOM_NAME_KEY = "plannotator-agent-custom";

function key(base: string, project?: string) {
  return project ? `${base}:${project}` : base;
}

// AgentSwitchOption is now a string to support dynamic agent names from OpenCode
export type AgentSwitchOption = string;

export interface AgentSwitchSettings {
  switchTo: AgentSwitchOption;
  customName?: string;
}

// Fallback options when API is unavailable or for non-OpenCode origins
export const AGENT_OPTIONS: {
  value: string;
  label: string;
  description: string;
}[] = [
  {
    value: "build",
    label: "Build",
    description: "Switch to build agent after approval",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Switch to a custom agent after approval",
  },
  {
    value: "disabled",
    label: "Disabled",
    description: "Stay on current agent after approval",
  },
];

const DEFAULT_SETTINGS: AgentSwitchSettings = {
  switchTo: "build",
};

/**
 * Get current agent switch settings from storage
 */
export function getAgentSwitchSettings(project?: string): AgentSwitchSettings {
  const stored =
    storage.getItem(key(STORAGE_KEY, project)) ?? storage.getItem(STORAGE_KEY);
  const customName =
    storage.getItem(key(CUSTOM_NAME_KEY, project)) ??
    storage.getItem(CUSTOM_NAME_KEY) ??
    undefined;

  if (stored) {
    return { switchTo: stored, customName };
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save agent switch settings to storage
 */
export function saveAgentSwitchSettings(
  settings: AgentSwitchSettings,
  project?: string,
): void {
  storage.setItem(key(STORAGE_KEY, project), settings.switchTo);
  if (settings.customName) {
    storage.setItem(key(CUSTOM_NAME_KEY, project), settings.customName);
  }
}

/**
 * Get the effective agent name for switching
 * Returns undefined if disabled, otherwise returns the agent name
 */
export function getEffectiveAgentName(
  settings: AgentSwitchSettings,
): string | undefined {
  if (settings.switchTo === "disabled") {
    return undefined;
  }
  if (settings.switchTo === "custom" && settings.customName) {
    return settings.customName;
  }
  return settings.switchTo; // 'build' or fallback
}
