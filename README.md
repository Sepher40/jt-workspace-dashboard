# jt-workspace-dashboard

Shared code for Jeremy's Claude dashboards. Each Claude account has one dashboard page (an artifact) that is only a **shell**: its settings plus one script tag that loads this package from npm. Change the dashboard here, once, and every dashboard picks it up.

The dashboard is a **consolidator**: it stores no tasks. To-dos live in Todoist, events in Google Calendar. The page reads and writes them with the viewer's own Claude connectors.

## Channels

| Channel | Who uses it | When it updates |
| --- | --- | --- |
| `latest` | Personal + Tactus dashboard | Every push to `main` (after tests pass) |
| `stable` | Pelicargo dashboard | Daily, once a release has been live 24 h. Run the **Publish** workflow by hand ("Run workflow") to ship sooner. |

Rollback: revert the bad commit on `main` (a new version is published automatically).

Publishing uses npm trusted publishing, linked to `.github/workflows/publish.yml` (keep all publishing in that one file).

## Shell config (`window.DASHBOARD_CONFIG`)

```js
{
  title: "Dashboard",
  ownerName: "Jeremy",
  labels: { ready: "Paused" },          // optional: Todoist label names for every workspace (defaults below)
  workspaces: [
    {
      id: "personal", name: "Personal", accent: "#2B8A6E",
      todoist: { projectId: "…" },       // or projectIds: [...]
      labels: { ready: "Ready to show" }, // optional: this workspace's label names (= section names)
      calendar: { ids: ["primary"], hide: ["Time Blocking"] },   // or false
      updateTask: "trig_…",
      notes: { dataSource: "collection id", minSteps: 3 },   // automatic Notion notes pages (or all: true)
      features: { handoff: false, meetingAsks: false, showFollowUp: false, chatLink: false, kickoff: false },
      kickoffKind: "treatment",          // optional: word used in the default kickoff prompt
      kickoffPrompt: "…{title}…{links}…" // optional: custom kickoff prompt ({title} {links} {figma} {notion} {todoist} {kind})
    }
  ]
}
```

The page's database (only used for the update button's status line) is read at `meta/status-<workspace id>`.

**Project notes pages:** a workspace with `notes` gets a Notion page per project, created by the page itself (no Claude tokens) in that Notion database: every task when `notes.all` is true (client work), otherwise once a task has `notes.minSteps` steps (default 3). The page gets the task's links, note, context and steps, the task gets a `Notion:` line (Notion chip), and completing the task sets the page's Status to Done. The update tasks add longer notes to the page's Notes section. Needs `Notion` → `notion-create-pages`, `notion-update-page` in the page's capabilities.

**Loading:** the page shows the last tasks and today's calendar it saw (saved in the browser) instantly, then refreshes from Todoist in the background: on open, every 2 minutes, and when you come back to the tab after 30+ seconds.

The page's declared capabilities must include `mcp` with Todoist (`find-tasks`, `find-completed-tasks`, `update-tasks`, `complete-tasks`, `uncomplete-tasks`, `delete-object`), Google Calendar (`list_events`), Claude Code Remote (`fire_trigger`), plus `host:claude_browser` (`preview_start`, `find`) if `chatLink` is on, and `db`.

## Todoist conventions

**Wording is the same everywhere:** a section's name on the dashboard is its Todoist label name. The only exception is the `ready` section: "Paused" for personal stuff, "Ready to show" for client work (set with the workspace's `labels.ready`). The update button is always "Update" and the side rail is always "Today".

**Sections come from labels** (one status label per task; none = To do):

| Section id | Default label | Shown as (default) |
| --- | --- | --- |
| `upcoming` | (no status label) | To do |
| `today` | `In progress` | In progress |
| `ready` | `Paused` (client work: `Ready to show`) | same as the label |
| `waiting` | `Waiting` | Waiting |
| `handoff` | `Handoff` | Handoff (feature `handoff`) |
| `later` | `Later` | Later |
| `meeting` | `Ask` | Under its meeting in the side rail (feature `meetingAsks`) |
| `done` | completed in Todoist | Completed (last 7 days) |

**Task description**, top to bottom (all optional):

```
Waiting on: Jon
Link: https://…          main source (Slack thread, Gmail, Fathom call); the chip is named after the app (Fathom, Slack…)
Figma: https://…
Notion: https://…         project notes / longer docs (shows a Notion chip)
Airtable: https://…       spec record, e.g. the Tactus Treatments table (shows an Airtable chip)
Chat: https://claude.ai/chat/…   (shows a Claude chip)
Meeting: Jeremy-Tactus UX   for Ask tasks: the meeting title it belongs to
One or two lines of note.
Context:
- decision or background bullet
```

**Project notes:** longer notes live in Notion, one page per project, linked from the task with the `Notion:` line (shown as a Notion chip). The update tasks create and maintain these pages: every Tactus task gets one; a personal task gets one once it has 3+ subtasks.

**Subtasks** are the checklist; a subtask's description lines are its notes. Subtasks labelled `Question` show in the card's **Questions** fold instead (complete = answered). Priority p1–p3 shows as Urgent / High / Medium.

## Develop

```
npm install
npm test        # builds dist/dashboard.js and runs the smoke test for every account setup
```
