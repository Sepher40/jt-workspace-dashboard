// Smoke test: runs the built dashboard in a fake browser with fake connectors, for each account setup.
// Fails (exit 1) if the page throws, shows the wrong tasks, or writes the wrong thing to Todoist.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const code = readFileSync(new URL("../dist/dashboard.js", import.meta.url), "utf8");
const now = new Date().toISOString();
let failures = 0;
const check = (ok, msg) => { if(!ok){ failures++; console.log("  FAIL:", msg); } else console.log("  ok:", msg); };
const wait = ms => new Promise(r => setTimeout(r, ms));

const TASKS = {
  P1: [
    {id: "a", content: "Organize Notion", description: "Context:\n- Six spaces approved.", priority: "p2", labels: [], addedAt: now, dueDate: "2020-01-01"},
    {id: "a1", content: "Research Notion", parentId: "a", labels: [], addedAt: now},
    {id: "a2", content: "Deeper step", parentId: "a1", labels: [], addedAt: now},
    {id: "b", content: "Voice inbox", description: "Waiting on: Naomi\nContext:\n- iPad first", labels: ["Waiting"], addedAt: "2020-01-01T00:00:00Z"}
  ],
  T1: [
    {id: "t", content: "Picture Recall", description: "Link: [Call](https://fathom.video/share/abc)\nFigma: https://www.figma.com/design/x\nNotion: https://www.notion.so/x\nChat: https://claude.ai/chat/1\nTighten spacing", labels: ["In progress"], addedAt: now},
    {id: "tq", content: "Which icon set?", parentId: "t", labels: ["Question"], addedAt: now},
    {id: "ts", content: "Rename tags", parentId: "t", description: "- Use 'Treatment tags'", labels: [], addedAt: now},
    {id: "h", content: "Category Connections", description: "", labels: ["Handoff"], addedAt: now},
    {id: "new1", content: "Remembering Numbers", description: "Figma: https://www.figma.com/design/y\nAirtable: https://airtable.com/app/tbl/rec1", labels: [], addedAt: now},
    {id: "ask", content: "Ask about pricing page", description: "Meeting: Jeremy-Tactus UX", labels: ["Ask"], addedAt: now}
  ]
};
const EVENTS = [{id: "e1", summary: "Jeremy-Tactus UX", start: {dateTime: "2026-11-16T10:00:00-08:00"}, end: {dateTime: "2026-11-16T11:00:00-08:00"}}, {id: "e2", summary: "Time Blocking", start: {dateTime: "2026-11-16T12:00:00-08:00"}}];

async function run(name, config, steps, opts = {}){
  console.log("\n" + name);
  const calls = [];
  const dom = new JSDOM('<!DOCTYPE html><div id="dashboard"></div>', {runScripts: "dangerously", pretendToBeVisual: true, url: "https://example.org/", beforeParse(w){
    w.DASHBOARD_CONFIG = config;
    const txt = o => ({content: [{type: "text", text: JSON.stringify(o)}]});
    w.claude = {use: async n => n === "mcp" && !opts.noConnectors ? {callTool: async (s, t, i) => {
      calls.push([s, t, i]);
      if(t === "find-tasks") return txt({tasks: TASKS[i.projectId] || []});
      if(t === "find-completed-tasks") return txt({tasks: i.projectId === "P1" ? [{id: "a3", content: "Old finished step", parentId: "a", labels: [], completedAt: now}] : []});
      if(t === "list_events") return txt({events: EVENTS});
      if(t === "notion-create-pages") return txt({pages: [{id: "n1", url: "https://app.notion.com/p/abc123?pvs=204"}]});
      return txt({});
    }} : n === "db" ? null : null};
  }});
  const errors = [];
  dom.window.addEventListener("error", e => errors.push(e.message));
  dom.window.addEventListener("unhandledrejection", e => errors.push(String(e.reason)));
  dom.window.eval(code);
  await wait(300);
  const d = dom.window.document, text = sel => (d.querySelector(sel)?.textContent || "").replace(/\s+/g, " ").trim();
  check(!errors.length, "no page errors " + (errors.length ? errors.join("; ") : ""));
  await steps({d, text, calls, w: dom.window, writes: () => calls.filter(c => !["find-tasks", "find-completed-tasks", "list_events"].includes(c[1]))});
  dom.window.close();
}

const LABEL_NAMES = {ready: "Paused"};
await run("Personal + Tactus (this account)", {
  ownerName: "Jeremy", labels: LABEL_NAMES,
  workspaces: [
    {id: "personal", name: "Personal", accent: "#3A5BD9", todoist: {projectId: "P1"}, notes: {dataSource: "DS_P", minSteps: 3}, updateTask: "trig_A"},
    {id: "tactus", name: "Tactus", accent: "#7B4FD1", todoist: {projectId: "T1"}, labels: {ready: "Ready to show"}, notes: {dataSource: "DS_T", all: true, figmaProp: "Figma"}, calendar: {hide: ["Time Blocking"]}, updateTask: "trig_B",
      kickoffKind: "treatment", features: {handoff: true, meetingAsks: true, showFollowUp: true, chatLink: false, kickoff: true}}
  ]
}, async ({d, text, calls, w, writes}) => {
  check(text("#wsSwitch").includes("Personal") && text("#wsSwitch").includes("Tactus"), "workspace switcher shows both");
  check(text("#list-upcoming").includes("Organize Notion") && text("#list-upcoming").includes("Deeper step"), "personal to-do with nested subtasks");
  check(text("#list-waiting").includes("Voice inbox") && text("#list-waiting").includes("Naomi"), "waiting on shows name");
  check(text("#main").includes("Paused") && text("#main").includes("Waiting") && !text("#main").includes("Ready to show"), "personal section names match labels");
  check(!d.getElementById("list-handoff"), "no handoff section in Personal");
  check(text("#meetings").includes("Time Blocking"), "personal shows all events");
  check(!text("#list-upcoming").includes("Old finished step") && text("#list-upcoming").includes("Show 1 completed"), "completed subtask hidden behind toggle");
  [...d.querySelectorAll("#list-upcoming .done-toggle")][0].click(); await wait(50);
  check(text("#list-upcoming").includes("Old finished step") && text("#list-upcoming").includes("Hide completed"), "toggle shows completed subtask");
  // main checkbox completes
  d.querySelector('#list-upcoming .item .main-check').click(); await wait(500);
  check(writes().some(c => c[1] === "complete-tasks" && c[2].ids[0] === "a"), "main checkbox completes the task in Todoist");
  // switch workspace
  [...d.querySelectorAll("#wsSwitch button")].find(b => b.textContent === "Tactus").click(); await wait(300);
  check(text("#list-today").includes("Picture Recall"), "tactus task in In progress");
  check(text("#main").includes("Ready to show"), "tactus section name");
  await wait(400);
  const created = writes().filter(c => c[1] === "notion-create-pages");
  check(created.length >= 1 && created.every(c => c[2].parent.data_source_id === "DS_T"), "notes pages created for Tactus projects only");
  check(!created.some(c => c[2].pages[0].properties.Name === "Picture Recall"), "no notes page when the task already has one");
  check(writes().some(c => c[1] === "update-tasks" && /Notion: https:\/\/app\.notion\.com\/p\/abc123(\n|$)/.test(c[2].tasks[0].description || "")), "Notion link written back to the task");
  check(text("#list-handoff").includes("Category Connections") && text("#list-handoff").includes("Copy handoff prompt"), "handoff section + prompt button");
  check(text("#list-today").includes("Figma") && text("#list-today").includes("Notes") && text("#list-today").includes("Questions · 1 open"), "figma + notion chips and questions fold");
  check(!text("#list-today .subs-box").includes("Which icon set") && text("#list-today .subs-box").includes("Rename tags"), "questions kept out of the checklist");
  check(text("#meetings").includes("Ask about pricing page"), "meeting ask under its meeting");
  check(text("#list-upcoming").includes("Remembering Numbers") && text("#list-upcoming").includes("Kick off"), "new to-do shows a Kick off button");
  check(!text("#list-today").includes("Kick off"), "no Kick off once a chat is linked");
  { let opened = ""; w.open = u => { opened = u; return {}; };
    [...d.querySelectorAll("#list-upcoming button.go")].find(b => b.textContent === "Kick off").click(); await wait(100);
    check(opened.startsWith("https://claude.ai/new?q=") && decodeURIComponent(opened).includes("Remembering Numbers") && decodeURIComponent(opened).includes("figma.com/design/y") && decodeURIComponent(opened).includes("treatment") && decodeURIComponent(opened).includes("airtable.com/app/tbl/rec1"), "Kick off opens a new chat with the prompt"); }
  check(text("#list-upcoming").includes("Spec"), "Airtable spec chip");
  check(d.querySelector('#list-today a.link-pill')?.href === "https://fathom.video/share/abc", "markdown-style Link line opens the real link");
  check(!text("#meetings").includes("Time Blocking"), "hidden calendar events");
  check(w.location.hash === "#tactus", "hash follows workspace");
  // move to ready via menu
  const item = d.querySelector("#list-today .item");
  item.querySelector(".more").click(); item.querySelector(".menu button").click(); await wait(400);
  const up = writes().find(c => c[1] === "update-tasks" && c[2].tasks[0].id === "t");
  check(up && JSON.stringify(up[2].tasks[0].labels) === '["Ready to show"]', "Ready to show writes the Ready to show label");
  check(text("#list-ready").includes("Picture Recall"), "moved card shows in Ready to show");
});

await run("Pelicargo-style (one workspace, other account)", {
  ownerName: "Jer",
  workspaces: [{id: "pelicargo", name: "Pelicargo", accent: "#E8710A", todoist: {projectId: "T1"}, labels: {ready: "Ready to show"}, features: {handoff: true, meetingAsks: true, showFollowUp: true}, updateTask: "trig_C"}]
}, async ({d, text}) => {
  check(d.getElementById("wsSwitch").hidden, "no switcher with one workspace");
  check(!!d.getElementById("list-handoff"), "handoff section present");
  check(text("#updateLabel") === "Update", "update button label");
});

await run("No connectors (opened outside Claude)", {workspaces: [{id: "x", name: "X", todoist: {projectId: "P1"}}]}, async ({text}) => {
  check(text("#refreshed").includes("Open this page in Claude"), "friendly message without connectors");
}, {noConnectors: true});

if(failures){ console.log("\n" + failures + " check(s) failed"); process.exit(1); }
console.log("\nAll checks passed");
