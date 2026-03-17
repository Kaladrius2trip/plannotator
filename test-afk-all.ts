/**
 * AFK Auto-Approve Test Suite
 *
 * Test 1: AFK (no browser) — server starts, nobody opens → auto-approve in 10s
 * Test 2: Browser opens — user sees idle popup after 15s, then auto-approve 10s later
 * Test 3: Real plan submission — pipe hook event to plannotator binary
 *
 * Usage:
 *   bun run test-afk-all.ts [1|2|3|all]
 */

import { startPlannotatorServer } from "./packages/server/index";

const PLAN = `# Test Plan

## Goals
- Verify AFK auto-approve works correctly
- Test idle popup in browser

## Steps
1. Start the server
2. Wait for timeout or user interaction
3. Check the result
`;

const HTML = await Bun.file("apps/hook/dist/index.html").text();

async function test1() {
  console.log("\n═══════════════════════════════════════");
  console.log("  TEST 1: AFK (no browser) — 10s timeout");
  console.log("═══════════════════════════════════════\n");

  const server = await startPlannotatorServer({
    plan: PLAN,
    origin: "claude-code",
    htmlContent: HTML,
    onReady: (url) => {
      console.log(`  Server ready at: ${url}`);
      console.log("  ⏳ NOT opening browser — waiting for AFK timeout...\n");
    },
  });

  const AFK_TIMEOUT_MS = 10_000;
  const start = Date.now();

  // Log countdown
  const tick = setInterval(() => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`\r  ⏱  ${elapsed}s / ${AFK_TIMEOUT_MS / 1000}s`);
  }, 200);

  const raced = await Promise.race([
    server.waitForViewing().then(() => "viewing" as const),
    new Promise<"afk">((r) => setTimeout(() => r("afk"), AFK_TIMEOUT_MS)),
  ]);

  clearInterval(tick);
  const elapsed = Date.now() - start;
  console.log(`\n\n  Result: ${raced} (${elapsed}ms)`);

  if (raced === "afk") {
    console.log("  ✅ Auto-approved (nobody opened the browser)");
  } else {
    console.log(
      "  ❌ Someone opened the browser — should not happen in this test",
    );
  }

  server.stop();
}

async function test2() {
  console.log("\n═══════════════════════════════════════");
  console.log("  TEST 2: Browser + Idle Popup");
  console.log("═══════════════════════════════════════\n");
  console.log(
    "  Flow: open browser → idle 15s → popup appears → idle 10s → auto-approve",
  );
  console.log("  👉 DON'T touch anything to see the full idle flow\n");

  const server = await startPlannotatorServer({
    plan: PLAN,
    origin: "claude-code",
    htmlContent: HTML,
    onReady: (url) => {
      console.log(`  Server ready at: ${url}`);
      console.log("  🌐 Opening browser...\n");
      // Open browser
      Bun.spawn(["xdg-open", url], { stdout: "ignore", stderr: "ignore" });
    },
  });

  const start = Date.now();
  const tick = setInterval(() => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`\r  ⏱  Waiting for decision... ${elapsed}s`);
  }, 200);

  // Once browser opens, waitForViewing resolves — then wait for decision (idle popup → auto-approve)
  const raced = await Promise.race([
    server.waitForViewing().then(() => "viewing" as const),
    new Promise<"afk">((r) => setTimeout(() => r("afk"), 10_000)),
  ]);

  if (raced === "afk") {
    clearInterval(tick);
    console.log("\n  ❌ Browser never loaded — AFK triggered instead");
    server.stop();
    return;
  }

  console.log(
    `\n  🌐 Browser loaded! Now waiting for idle popup → auto-approve...`,
  );
  console.log("  (idle timer: 15s → popup → 10s → approve, ~25s total)\n");

  const result = await server.waitForDecision();
  clearInterval(tick);
  const elapsed = Date.now() - start;

  console.log(`\n  Result: approved=${result.approved} (${elapsed}ms)`);
  if (result.approved) {
    console.log("  ✅ Auto-approved via idle popup");
  } else {
    console.log(`  ❌ Denied: ${result.feedback}`);
  }

  await Bun.sleep(1000);
  server.stop();
}

async function test3() {
  console.log("\n═══════════════════════════════════════");
  console.log("  TEST 3: Real Plan Submission (hook binary)");
  console.log("═══════════════════════════════════════\n");

  const event = JSON.stringify({
    tool_input: { plan: PLAN },
    permission_mode: "default",
  });

  console.log("  Piping hook event to plannotator binary...");
  console.log(
    "  ⏳ Should auto-approve in ~10s if you don't open the browser\n",
  );

  const start = Date.now();
  const proc = Bun.spawn(["/home/yevhenii/.local/bin/plannotator"], {
    stdin: new Response(event).body!,
    stdout: "pipe",
    stderr: "pipe",
  });

  const tick = setInterval(() => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`\r  ⏱  Waiting... ${elapsed}s`);
  }, 200);

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;

  clearInterval(tick);
  const elapsed = Date.now() - start;

  console.log(`\n\n  Exit code: ${code} (${elapsed}ms)`);
  if (stderr) console.log(`  stderr: ${stderr.trim()}`);

  try {
    const output = JSON.parse(stdout);
    const decision = output?.hookSpecificOutput?.decision;
    console.log(`  Decision: ${JSON.stringify(decision)}`);

    if (decision?.behavior === "allow") {
      console.log("  ✅ Hook binary auto-approved the plan");
    } else {
      console.log("  ❌ Hook binary denied the plan");
    }
  } catch {
    console.log(`  Raw stdout: ${stdout}`);
    console.log("  ❌ Could not parse hook output");
  }
}

// Parse args
const arg = process.argv[2] || "all";
const tests = arg === "all" ? ["1", "2", "3"] : [arg];

for (const t of tests) {
  if (t === "1") await test1();
  else if (t === "2") await test2();
  else if (t === "3") await test3();
  else console.log(`Unknown test: ${t}`);
}

console.log("\n✨ Done.\n");
process.exit(0);
