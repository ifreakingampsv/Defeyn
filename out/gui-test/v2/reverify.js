// Re-verification of the browser-seam flows that the first pass could not
// reach (S7–S10) after two fixes: BoardPanel context Provider + SSE CORS.
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const APP = "http://127.0.0.1:5174";
const API = "http://127.0.0.1:8788";
const SERVER_DIR = "/home/psv/Code/Defeyn/server";
const APP_DIR = "/home/psv/Code/Defeyn/app";
const TMPD = fs.mkdtempSync(path.join(os.tmpdir(), "defeyn-reverify-"));

let server, preview;
const results = [];
const check = (name, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
};

(async () => {
  server = spawn(process.execPath, [SERVER_DIR + "/node_modules/tsx/dist/cli.mjs", SERVER_DIR + "/src/index.ts"], {
    cwd: SERVER_DIR,
    env: { ...process.env, PORT: "8788", DB_PATH: path.join(TMPD, "b.db"), LLM_PROVIDER: "local", KEEPALIVE_MS: "0" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  preview = spawn("npx", ["vite", "preview", "--port", "5174", "--strictPort"], {
    cwd: APP_DIR, env: { ...process.env }, stdio: ["ignore", "ignore", "pipe"],
  });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${API}/api/health`)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(APP + "/")).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4"],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 980 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 300)));

  await page.goto(`${APP}/?v=${Date.now()}`, { waitUntil: "networkidle" });
  // signup
  await page.goto(`${APP}/login`);
  await page.fill('input[placeholder="Ada Lovelace"]', "Rev");
  await page.fill('input[placeholder="ada@example.com"]', `r${Date.now()}@t.dev`);
  await page.fill('input[placeholder="At least 6 characters"]', "secret123");
  await page.evaluate(() => [...document.querySelectorAll("button[type='submit']")].find((b) => /start learning/i.test(b.textContent)).click());
  await page.waitForURL("**/app**", { timeout: 15000 });

  // goal turn: the /app empty state takes the goal and creates the session
  await page.fill('input[placeholder*="I want to learn"]', "I want to learn how to bake sourdough bread");
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Draft my course/i.test(b.textContent)).click());
  await page.waitForFunction(() => /syllabus/i.test(document.body.innerText), { timeout: 25000 });
  check("goal turn (cross-origin SSE works)", true);

  // continue → lesson
  await page.fill("textarea", "continue");
  await page.evaluate(() => document.querySelector("button[aria-label='Send message']").click());
  await page.waitForFunction(() => document.body.innerText.includes("Part 1"), { timeout: 20000 });

  // notes → board cards must RENDER (the crash fix)
  await page.fill("textarea", "give me notes");
  await page.evaluate(() => document.querySelector("button[aria-label='Send message']").click());
  await page.waitForSelector(".react-flow__node", { timeout: 25000 });
  const cardCount = await page.locator(".react-flow__node").count();
  check("S7 notes → board cards render (no crash)", cardCount >= 2, `${cardCount} cards, pageerrors=${pageErrors.length}`);

  // + Card button creates a card
  await page.locator("button[title='Add a Card at the center of the view']").click();
  await page.waitForFunction((n) => document.querySelectorAll(".react-flow__node").length > n, cardCount, { timeout: 10000 });
  check("S8 + Card creates a card", true);

  // drag the first card
  const first = page.locator(".react-flow__node").first();
  const before = await first.boundingBox();
  await page.mouse.move(before.x + before.width / 2, before.y + 8);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 90, before.y + 150, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);

  // connect two cards via handles (drag from right handle of card 2 to left handle of card 1)
  const nodes = page.locator(".react-flow__node");
  const n2 = await nodes.nth(1).boundingBox();
  const n3 = await nodes.nth(2).boundingBox();
  await page.mouse.move(n2.x + n2.width - 4, n2.y + n2.height / 2);
  await page.mouse.down();
  await page.mouse.move(n3.x + 6, n3.y + n3.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const edgeCount = await page.locator(".react-flow__edge").count();
  check("S9 edge created", edgeCount >= 1, `${edgeCount} edges`);

  // reload → everything persists
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".react-flow__node", { timeout: 15000 });
  const afterReload = await page.locator(".react-flow__node").count();
  const edgesAfter = await page.locator(".react-flow__edge").count();
  check("S8/S9 reload persists cards + edge", afterReload >= cardCount + 1 && edgesAfter >= 1, `${afterReload} cards, ${edgesAfter} edges`);

  // delete the created card with confirm
  const created = page.locator(".react-flow__node", { hasText: "New card" }).first();
  await created.hover();
  await page.locator(".react-flow__node", { hasText: "New card" }).first().getByRole("button", { name: /delete/i }).click();
  await page.waitForSelector("[role='alertdialog']", { timeout: 5000 });
  const dialogText = await page.locator("[role='alertdialog']").innerText();
  check("S10 delete confirm dialog names the card + no undo", /permanently deleted/i.test(dialogText) && /no undo/i.test(dialogText));
  await page.locator("[role='alertdialog']").getByRole("button", { name: /Delete Card/i }).click();
  await page.waitForTimeout(800);
  const finalCount = await page.locator(".react-flow__node").count();
  check("S10 card deleted after confirm", finalCount === afterReload - 1, `${finalCount} cards left`);

  check("no page errors during the whole flow", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  await page.screenshot({ path: "/tmp/defeyn-browser/reverify-final.png" });
  await browser.close();

  console.log(results.join("\n"));
  server?.kill("SIGTERM");
  preview?.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 400));
  fs.rmSync(TMPD, { recursive: true, force: true });
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
})().catch(async (e) => {
  console.error("REVERIFY CRASHED:", e);
  console.log(results.join("\n"));
  server?.kill("SIGKILL");
  preview?.kill("SIGKILL");
  process.exit(1);
});
