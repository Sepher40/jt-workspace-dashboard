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
  labels: { ready: "Paused" },          // optional: Todoist label names (defaults below)
  workspaces: [
    {
      id: "personal", name: "Personal", accent: "#2B8A6E",
      todoist: { projectId: "…" },       // or projectIds: [...]
      sections: { ready: "Paused" },      // display names; ids are fixed
      calendar: { ids: ["primary"], hide: ["Time Blocking"] },   // or false
      updateTask: "trig_…", updateLabel: "Sort inbox",
      features: { handoff: false, meetingAsks: false, showFollowUp: false, chatLink: false }
    }
  ]
}
```

The page's database (only used for the update button's status line) is read at `meta/status-<workspace id>`.

The page's declared capabilities must include `mcp` with Todoist (`find-tasks`, `find-completed-tasks`, `update-tasks`, `complete-tasks`, `uncomplete-tasks`, `delete-object`), Google Calendar (`list_events`), Claude Code Remote (`fire_trigger`), plus `host:claude_browser` (`preview_start`, `find`) if `chatLink` is on, and `db`.

## Todoist conventions

**Sections come from labels** (one status label per task; none = To do):

| Section id | Default label | Shown as (default) |
| --- | --- | --- |
| `upcoming` | (no status label) | To do |
| `today` | `In progress` | In progress |
| `ready` | `Paused` | Paused / Ready to show |
| `waiting` | `Waiting` | Waiting on others |
| `handoff` | `Handoff` | Handoff prep (feature `handoff`) |
| `later` | `Later` | Later |
| `meeting` | `Ask` | Under its meeting in the side rail (feature `meetingAsks`) |
| `done` | completed in Todoist | Completed (last 7 days) |

**Task description**, top to bottom (all optional):

```
Waiting on: Jon
Link: https://…          main source (Slack thread, Gmail, Fathom call)
Figma: https://…
Chat: https://claude.ai/chat/…
Meeting: Jeremy-Tactus UX   for Ask tasks: the meeting title it belongs to
One or two lines of note.
Context:
- decision or background bullet
```

**Subtasks** are the checklist; a subtask's description lines are its notes. Subtasks labelled `Question` show in the card's **Questions** fold instead (complete = answered). Priority p1–p3 shows as Urgent / High / Medium.

## Develop

```
npm install
npm test        # builds dist/dashboard.js and runs the smoke test for every account setup
```
