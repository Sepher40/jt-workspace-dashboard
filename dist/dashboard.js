/* Shared dashboard. Each account's page sets window.DASHBOARD_CONFIG, then loads this file.
   The dashboard holds no tasks of its own: it reads and writes them in Todoist (and shows Google Calendar),
   using the viewer's own connectors. See README.md for the config format and the Todoist conventions. */
(function(){
  "use strict";
  const CFG = window.DASHBOARD_CONFIG || {};
  const WORKSPACES = Array.isArray(CFG.workspaces) && CFG.workspaces.length ? CFG.workspaces : [{id: "main", name: "Dashboard", todoist: {}}];
  const BASE_LABELS = Object.assign({today: "In progress", ready: "Paused", waiting: "Waiting", later: "Later", handoff: "Handoff", meeting: "Ask", question: "Question"}, CFG.labels || {});
  let LABELS = BASE_LABELS; // per workspace: BASE_LABELS + workspace.labels
  const OWNER_NAME = String(CFG.ownerName || "").slice(0, 40);
  const VERSION = "0.1.0";

  /* ---------- page skeleton ---------- */
  document.title = CFG.title || "Dashboard";
  const styleEl = document.createElement("style"); styleEl.textContent = "/* Layout: header with day summary; tasks in a main column of soft cards, meetings + notes in a side rail. Each card has a left gutter that holds the section dot and the drag handles, so text lines up. */\n:root{\n  --bg:#F2F4F7; --surface:#FFFFFF; --fg:#1D2433; --soft:#5B6475; --faint:#98A1B0; --line:#E6E9EE;\n  --accent:#3A5BD9; --accent-soft:#E9EEFD; --green:#26946A; --green-soft:#E2F3EB; --amber:#B86E12; --amber-soft:#FBEFDC; --grey:#A3ABB8; --violet:#7B4FD1; --s-todo:#95A2B3; --s-prog:#F2C94C; --s-ready:#4CB782; --s-wait:#F2994A; --s-hand:#26B5CE; --s-later:#BEC2C8; --s-done:#8E9AAF; --wait-soft:#FDEEDF; --wait-text:#A3530F; --line-strong:#D3D8E0; --new:#D6336C;\n  --shadow:0 1px 2px rgba(20,30,50,.05),0 4px 16px rgba(20,30,50,.05);\n  --font:\"Figtree\",-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;\n}\n@media (prefers-color-scheme: dark){:root:not([data-theme=\"light\"]){\n  --bg:#111318; --surface:#1A1D24; --fg:#E7EAF0; --soft:#A4ACBA; --faint:#6E7686; --line:#2A2F39;\n  --accent:#93A9FF; --accent-soft:#232B47; --green:#5FCB9C; --green-soft:#1A3328; --amber:#E7AA5A; --amber-soft:#3A2C18; --grey:#6E7686; --violet:#B69CF5; --s-todo:#8A8F98; --s-prog:#F2C94C; --s-ready:#4CB782; --s-wait:#F2994A; --s-hand:#26B5CE; --s-later:#5A606B; --s-done:#6A7486; --wait-soft:#3B2716; --wait-text:#F5B07A; --line-strong:#3A404C; --new:#F17FA8;\n  --shadow:0 1px 2px rgba(0,0,0,.3); color-scheme:dark}}\n:root[data-theme=\"dark\"]{\n  --bg:#111318; --surface:#1A1D24; --fg:#E7EAF0; --soft:#A4ACBA; --faint:#6E7686; --line:#2A2F39;\n  --accent:#93A9FF; --accent-soft:#232B47; --green:#5FCB9C; --green-soft:#1A3328; --amber:#E7AA5A; --amber-soft:#3A2C18; --grey:#6E7686; --violet:#B69CF5; --s-todo:#8A8F98; --s-prog:#F2C94C; --s-ready:#4CB782; --s-wait:#F2994A; --s-hand:#26B5CE; --s-later:#5A606B; --s-done:#6A7486; --wait-soft:#3B2716; --wait-text:#F5B07A; --line-strong:#3A404C; --new:#F17FA8;\n  --shadow:0 1px 2px rgba(0,0,0,.3); color-scheme:dark}\n*{box-sizing:border-box}\n[hidden]{display:none!important}\nbody{background:var(--bg);color:var(--fg);font-family:var(--font);margin:0;-webkit-font-smoothing:antialiased}\n.wrap{max-width:1060px;margin:0 auto;padding-block:36px 72px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}\nbutton{font:inherit;cursor:pointer}\n\n/* header */\nheader{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:14px 24px;margin-bottom:24px}\n.kicker{font-size:13px;font-weight:600;color:var(--accent);letter-spacing:.02em;margin-bottom:4px}\nh1{font-size:32px;line-height:1.1;font-weight:800;letter-spacing:-.02em;margin:0;text-wrap:balance}\n.sub{font-size:14px;color:var(--soft);margin-top:6px}\n.pills{display:flex;flex-wrap:wrap;gap:8px}\n.pill{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;padding:6px 12px;border-radius:999px;background:var(--surface);box-shadow:var(--shadow);color:var(--fg);font-variant-numeric:tabular-nums}\n.pill i{width:8px;height:8px;border-radius:50%;display:block}\n.head-right{display:flex;flex-wrap:wrap;align-items:center;gap:8px}\n.link-chats{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700;padding:9px 18px;border-radius:999px;border:0;background:var(--accent);color:var(--surface);box-shadow:0 2px 8px rgba(58,91,217,.25)}\n.link-chats:hover:not(:disabled){filter:brightness(1.08)}\n.link-chats:disabled{opacity:.85;cursor:default}\n.link-chats svg{width:15px;height:15px}\n.link-chats.busy svg{animation:spin 1s linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}\n@media (prefers-reduced-motion: reduce){.link-chats.busy svg{animation:none}}\n.clear-new{font:inherit;font-size:13px;font-weight:650;padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--new);cursor:pointer}\n.clear-new:hover{border-color:var(--new)}\n.update-wrap{position:relative;display:inline-flex}\n.update-state{font:inherit;font-size:12.5px;color:var(--faint);background:none;border:0;padding:4px 2px;cursor:help;text-decoration:underline dotted;text-underline-offset:3px}\n.update-state:empty{display:none}\n.update-tip{position:absolute;right:0;top:calc(100% + 6px);z-index:30;width:max-content;max-width:min(320px,80vw);background:var(--fg);color:var(--bg);font-size:13px;line-height:1.45;padding:9px 12px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.2);white-space:pre-line}\n.update-wrap:hover .update-tip:not(:empty),.update-wrap:focus-within .update-tip:not(:empty),.update-tip.show:not(:empty){display:block!important}\n.status{flex-basis:100%;font-size:13px;color:var(--amber)}\n\n/* layout */\n.grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}\n.rail{display:grid;gap:20px;position:sticky;top:calc(16px + env(safe-area-inset-top,0px))}\n.main{display:grid;gap:20px;min-width:0}\n.card{background:var(--surface);border-radius:16px;box-shadow:var(--shadow);padding:18px 20px 12px 46px;position:relative;min-width:0}\n.rail .card{padding:18px 20px 18px 20px}\nh2{font-size:16px;font-weight:700;margin:0 0 8px;display:flex;gap:8px;align-items:center;position:relative}\n.card > h2 .dot{position:absolute;left:-28px;top:50%;width:10px;height:10px;margin-top:-5px;border-radius:50%}\n.count{font-size:12px;font-weight:700;min-width:22px;height:20px;padding:0 7px;border-radius:999px;background:var(--bg);color:var(--soft);display:inline-flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}\n.count:empty{display:none}\nh3{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin:14px 0 2px;display:flex;align-items:center;gap:8px;position:relative}\nh3 .dot{position:absolute;left:-27px;width:8px;height:8px;border-radius:50%}\n.h-ready{color:var(--green)} .h-waiting{color:var(--amber)}\nul{list-style:none;margin:0;padding:0}\n.empty{font-size:14px;color:var(--faint);padding:10px 0 12px}\n\n/* meetings */\n#meetings{display:grid;gap:8px;margin-top:6px}\n.mtg{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;background:var(--accent-soft)}\n.mtg .time{font-size:12.5px;font-weight:700;color:var(--accent);min-width:0;white-space:nowrap;font-variant-numeric:tabular-nums}\n.mtg a,.mtg span.t{color:var(--fg);font-weight:600;font-size:14.5px;text-decoration:none;min-width:0;overflow-wrap:anywhere}\n.mtg a:hover{text-decoration:underline}\n#meetings .empty{padding:4px 0}\n#meetings{gap:14px}\n.mtg-block{display:grid;gap:6px}\n.agenda-h{font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--soft);margin:6px 0 0 2px}\n.agenda{display:grid;gap:2px}\n.ask{display:flex;align-items:flex-start;gap:10px;padding:6px 2px}\n.check{flex:none;width:20px;height:20px;margin-top:1px;border-radius:6px;border:2px solid var(--grey);background:transparent;padding:0;position:relative}\n.check:hover{border-color:var(--accent);background:var(--accent-soft)}\n.ask .t{flex:1;min-width:0;font-size:14.5px;font-weight:500;line-height:1.4;overflow-wrap:anywhere}\n.ask .n{display:block;font-size:13px;font-weight:400;line-height:1.5;color:var(--soft);margin-top:4px;white-space:pre-line}\n.note{white-space:pre-line}\n.subs{display:grid;gap:2px;margin:8px 0 0}\n.sub{display:flex;align-items:flex-start;gap:9px;font-size:14px;line-height:1.45;color:var(--fg);padding:3px 0}\n.sub .check{width:18px;height:18px;border-radius:5px;margin-top:1px}\n.sub.done span{color:var(--faint);text-decoration:line-through}\n.sub.done .check{background:var(--accent);border-color:var(--accent)}\n.sub.done .check::after{content:\"\";position:absolute;left:50%;top:45%;width:4px;height:8px;border:solid var(--surface);border-width:0 2px 2px 0;transform:translate(-50%,-50%) rotate(45deg)}\n.done-toggle{display:block;border:0;background:none;padding:4px 0 0 27px;font-size:12.5px;font-weight:600;color:var(--faint);cursor:pointer}\n.done-toggle:hover{color:var(--accent)}\n.sub-count{font-size:12px;font-weight:700;color:var(--faint);margin-left:8px;font-variant-numeric:tabular-nums}\n.add-sub{display:block;border:0;background:none;color:var(--faint);font-size:13px;font-weight:600;padding:4px 0 0 27px}\n.add-sub:hover{color:var(--accent)}\n.sub-input{font:inherit;font-size:14px;margin:4px 0 0 27px;width:calc(100% - 27px);padding:6px 9px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)}\n.new-tag{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:var(--new);border-radius:999px;padding:2px 8px;margin-left:8px;vertical-align:2px}\n.sub-new{flex:none;width:7px;height:7px;border-radius:50%;background:var(--new);margin-top:7px}\n.ask .new-tag{margin-left:6px;vertical-align:1px}\n.clamp:not(.open){display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.ctx{margin-top:10px;padding:8px 12px;border-radius:10px;background:var(--bg);cursor:pointer}\n.ctx:hover{background:var(--accent-soft)}\n.ctx.open{padding-bottom:10px}\n.ctx-h{display:flex;align-items:center;gap:6px;width:100%;border:0;background:none;padding:0;cursor:pointer;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);text-align:left}\n.ctx-h svg{width:12px;height:12px;transform:rotate(-90deg);transition:transform .15s}\n.ctx.open .ctx-h svg{transform:none}\n.ctx.open .ctx-h{margin-bottom:6px}\n.sub-wrap{display:block}\n.sub-t.has-notes{cursor:pointer}\n.sub-t.has-notes:hover{color:var(--accent)}\n.sub-tg{flex:none;width:22px;height:22px;margin-left:auto;border:0;border-radius:6px;background:transparent;color:var(--faint);padding:0;display:flex;align-items:center;justify-content:center}\n.sub-tg:hover{background:var(--bg);color:var(--fg)}\n.sub-tg svg{width:12px;height:12px;transform:rotate(-90deg);transition:transform .15s}\n.sub.open .sub-tg svg{transform:none}\n.bullets{list-style:disc;margin:0;padding-left:18px;display:grid;gap:4px;font-size:13.5px;line-height:1.5;color:var(--soft)}\n.bullets li::marker{color:var(--faint)}\n.sub-notes{margin:2px 0 6px 27px;padding:8px 10px;border-radius:8px;background:var(--bg);display:grid;gap:5px}\n.ctx .read-more{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);opacity:0;transition:opacity .12s;background:var(--surface);padding:3px 12px;border-radius:999px;box-shadow:var(--shadow);white-space:nowrap}\n.ctx:hover .read-more,.ctx:focus-within .read-more{opacity:1}\n@media (hover:none){.ctx .read-more{opacity:1}}\n.ctx-body{display:grid;gap:6px}\n.ctx-row{margin:0;font-size:13.5px;line-height:1.5;color:var(--soft);overflow-wrap:anywhere}\n.ctx-src{font-weight:700;color:var(--fg);margin-right:6px}\n.clampbox.clamp:not(.open){display:grid;-webkit-line-clamp:unset;max-height:4.6em;overflow:hidden;-webkit-mask-image:linear-gradient(#000 60%,transparent);mask-image:linear-gradient(#000 60%,transparent)}\n.read-more{display:block;border:0;background:none;color:var(--accent);font-size:12.5px;font-weight:650;padding:2px 0 0;margin:0}\n.read-more:hover{text-decoration:underline}\n.ask .actions{margin:0}\n.ask .actions .more{padding:1px 8px}\n.ask .menu{left:auto;right:0}\n.mini{display:flex;align-items:flex-start;gap:9px;font-size:14px;line-height:20px;padding:4px 2px;color:var(--fg)}\n.mini i{flex:none;width:7px;height:7px;border-radius:50%;margin-top:6.5px}\n.mini .mt{flex:1;min-width:0;overflow-wrap:anywhere}\n.mini .sub2{color:var(--faint);font-size:13px;margin-left:8px}\n\n/* notes */\n.notes textarea{display:block;width:100%;min-height:96px;resize:vertical;font:inherit;font-size:14.5px;line-height:1.55;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--fg);margin-top:6px}\n.notes textarea:focus{background:var(--surface)}\n.notes-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-top:10px}\n.notes-bar .sub{font-size:12.5px;color:var(--faint);margin:0;flex:1 1 140px}\n.primary{font-size:14px;font-weight:700;padding:9px 16px;border-radius:10px;border:0;background:var(--accent);color:var(--surface)}\n.primary:hover:not(:disabled){filter:brightness(1.08)}\n.primary:disabled{opacity:.5;cursor:default}\n\n/* items */\n.item{position:relative;padding:12px 34px 12px 0;border-top:1px solid var(--line)}\n.chev{position:absolute;right:0;top:10px;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:var(--faint);padding:0;display:flex;align-items:center;justify-content:center}\n.chev:hover{background:var(--bg);color:var(--fg)}\n.chev svg{width:14px;height:14px;transition:transform .15s}\n.item.collapsed .chev svg{transform:rotate(-90deg)}\n.item.collapsed > .note,.item.collapsed > .read-more,.item.collapsed > .subs,.item.collapsed > .ctx,.item.collapsed > .done-toggle,.item.collapsed > .actions{display:none}\n.item.collapsed{padding-bottom:10px}\n.links{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}\n.prio{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:650;color:var(--soft);padding:3px 9px 3px 7px;border-radius:999px;border:1px solid var(--line);background:var(--surface)}\n.prio svg{width:14px;height:14px;flex:none}\n.prio-urgent{color:#E8590C}\n.link-pill{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:650;color:var(--soft);text-decoration:none;padding:3px 10px 3px 8px;border-radius:999px;border:1px solid var(--line);background:var(--surface)}\n.link-pill:hover{color:var(--fg);border-color:var(--faint)}\n.link-pill svg{width:13px;height:13px;flex:none}\n.foldable > h2{cursor:pointer;padding-right:36px;user-select:none}\n.foldable > h2 .chev{top:50%;margin-top:-14px}\n.foldable.collapsed > :not(h2){display:none}\n.foldable.collapsed{padding-bottom:18px}\n.foldable.collapsed > h2{margin-bottom:0}\n.foldable.collapsed > h2 .chev svg{transform:rotate(-90deg)}\nli.item:first-child{border-top-color:transparent}\n.item[draggable=\"true\"]{cursor:pointer}\n.item.grabbing,.item.grabbing *,.item.dragging,.item.dragging *{cursor:grabbing!important}\n.item.dragging{opacity:.4}\n.item.over{box-shadow:0 -2px 0 var(--accent)}\n.handle{position:absolute;left:-42px;top:6px;width:34px;display:flex;flex-direction:column;align-items:center;opacity:0;transition:opacity .12s}\n.item:hover .handle,.item:focus-within .handle{opacity:1}\n.handle button{border:0;background:transparent;color:var(--faint);width:34px;height:22px;padding:0;font-size:11px;line-height:1;border-radius:6px}\n.handle button:hover:not(:disabled){color:var(--fg);background:var(--accent-soft)}\n.handle button:disabled{opacity:.3;cursor:default}\n.grip{cursor:grab;color:var(--faint);font-size:13px;line-height:1;padding:3px 0;user-select:none}\n.title{font-size:15.5px;font-weight:650;color:var(--fg);text-decoration:none;overflow-wrap:anywhere}\na.title:hover{color:var(--accent)}\n.ref{display:inline-block;font-size:11.5px;font-weight:700;color:var(--soft);background:var(--bg);border-radius:6px;padding:2px 7px;margin-left:8px;vertical-align:2px;font-variant-numeric:tabular-nums;letter-spacing:.02em}\n.who{display:inline-block;font-size:12px;font-weight:700;color:var(--amber);background:var(--amber-soft);border-radius:999px;padding:2px 9px;margin-left:8px;vertical-align:2px}\n.note{font-size:14px;line-height:1.5;color:var(--soft);margin:4px 0 0;overflow-wrap:anywhere}\n.actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}\n.actions button{font-size:13px;font-weight:600;padding:5px 12px;border-radius:8px;border:0;background:transparent;color:var(--soft)}\n.actions button.go{background:var(--accent-soft);color:var(--accent)}\n.actions button.go:hover{background:var(--accent);color:var(--surface)}\n.view-toggle{display:inline-flex;background:var(--surface);border-radius:10px;padding:3px;box-shadow:var(--shadow)}\n.view-toggle button{border:0;background:transparent;color:var(--soft);font:inherit;font-size:13px;font-weight:600;padding:5px 11px;border-radius:8px;cursor:pointer}\n.view-toggle button[aria-pressed=\"true\"]{background:var(--accent-soft);color:var(--accent)}\n.board{display:none}\n.active-only .card[data-key=\"upcoming\"],.active-only .card[data-key=\"later\"],.active-only .completed-card{display:none}\n.wrap.board-view{max-width:1520px}\n.board-view .board{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(210px,1fr);gap:12px;overflow-x:auto;min-width:0;padding-bottom:6px;align-items:stretch}\n.board-view .main{display:none}\n.kcol{background:var(--surface);border-radius:16px;box-shadow:var(--shadow);padding:14px 10px 10px;display:flex;flex-direction:column;min-height:240px;min-width:0}\n.kcol h2{font-size:14px;display:flex;gap:8px;align-items:center;margin:0 4px 10px}\n.kcol h2 i{width:9px;height:9px;border-radius:50%;flex:none}\n.kcol ul{display:grid;gap:8px;align-content:start;flex:1;min-height:80px;border-radius:10px;transition:background .15s}\n.kcol ul.over{background:var(--accent-soft)}\n.kcard{background:var(--bg);border-radius:10px;padding:10px 11px;cursor:pointer;display:grid;gap:6px;font-size:14px;min-width:0}\n.kcard:hover{box-shadow:inset 0 0 0 1px var(--line)}\n.drawer-back{position:fixed;inset:0;background:rgba(0,0,0,.28);z-index:40}\n.drawer{position:fixed;top:0;right:0;bottom:0;width:min(480px,100%);background:var(--surface);box-shadow:-14px 0 40px rgba(0,0,0,.18);transform:translateX(105%);transition:transform .2s ease;z-index:41;overflow-y:auto;padding:calc(14px + env(safe-area-inset-top,0px)) 22px calc(28px + env(safe-area-inset-bottom,0px)) 48px}\n.drawer.open{transform:none}\n.drawer-head{display:flex;justify-content:space-between;align-items:center;margin:0 0 6px -26px}\n.drawer-sec{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--soft)}\n.drawer-close{border:0;background:var(--bg);color:var(--soft);width:32px;height:32px;border-radius:8px;display:grid;place-items:center;cursor:pointer}\n.drawer-close svg{width:16px;height:16px}\n.drawer-close:hover{color:var(--fg)}\n#drawerBody .chev{display:none}\n.kcard.dragging{opacity:.4}\n.kref{font-size:11.5px;font-weight:700;color:var(--soft);letter-spacing:.03em}\n.kt{font-weight:600;line-height:1.35;overflow-wrap:anywhere;color:var(--fg)}\n.kmeta{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;font-size:12px;color:var(--soft)}\n.kmeta a{color:var(--accent);text-decoration:none;font-weight:600}\n.kmeta a:hover{text-decoration:underline}\n.kmove{font:inherit;font-size:12px;color:var(--soft);background:transparent;border:1px solid var(--line);border-radius:6px;padding:2px 4px;margin-left:auto;max-width:100%}\n.reopen{margin-left:auto;flex:none;border:0;border-radius:8px;padding:3px 9px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;background:var(--accent-soft);color:var(--accent)}\n.reopen:hover{background:var(--accent);color:var(--surface)}\n.kick-box{margin-top:8px;display:grid;gap:4px;max-width:460px}\n.kick-row{display:flex;gap:6px;align-items:center}\n.kick-row input{flex:1;min-width:0;margin-left:0}\n.kick-row button{border:0;border-radius:8px;padding:6px 10px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;background:var(--bg);color:var(--soft)}\n.kick-row button.go{background:var(--accent);color:var(--surface)}\n.kick-hint{font-size:12px;color:var(--faint)}\n.actions .more{padding:5px 10px;letter-spacing:1px;font-weight:800}\n.actions .more:hover,.actions .more[aria-expanded=\"true\"]{background:var(--bg);color:var(--fg)}\n.menu-wrap{position:relative;display:inline-block}\n.menu{position:absolute;z-index:20;top:calc(100% + 6px);left:0;min-width:220px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px rgba(20,30,50,.16);padding:6px;display:grid;gap:2px}\n.actions .menu button{text-align:left;padding:8px 10px;border-radius:8px;font-size:13.5px;font-weight:500;color:var(--fg)}\n.actions .menu button:hover{background:var(--accent-soft)}\n.actions .menu button.danger{color:var(--amber)}\n.actions .menu button.danger:hover{background:var(--amber-soft)}\n\n/* later accordion */\ndetails.later{margin:6px 0 4px;border-top:1px solid var(--line);padding-top:10px}\ndetails.later summary{cursor:pointer;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--soft);padding:4px 0;list-style:none;display:flex;gap:8px;align-items:center;position:relative}\ndetails.later summary::-webkit-details-marker{display:none}\ndetails.later summary::before{content:\"\";position:absolute;left:-29px;width:0;height:0;border-left:6px solid var(--grey);border-top:5px solid transparent;border-bottom:5px solid transparent;transition:transform .15s}\ndetails.later[open] summary::before{transform:rotate(90deg)}\n\n.handle{display:none!important}\n@media (hover:none){\n  .handle{display:flex!important;position:static;width:auto;flex-direction:row;gap:6px;opacity:1}\n  .handle .grip{display:none}\n  .handle button{width:auto;height:auto;font-size:12px;padding:4px 9px;background:var(--bg)}\n  .item .handle{float:right;margin-left:8px}\n}\n@media (max-width:880px){\n  .grid{grid-template-columns:minmax(0,1fr)}\n  .rail{position:static;order:-1}\n}\n@media (max-width:560px){\n  h1{font-size:26px}\n  .card{padding:16px 16px 10px 34px}\n  .card > h2 .dot{left:-21px}\n  h3 .dot{left:-20px}\n  details.later summary::before{left:-22px}\n}\nbutton:focus-visible,textarea:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}\n.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(20px + env(safe-area-inset-bottom,0px));background:var(--fg);color:var(--bg);font-size:14px;font-weight:500;padding:11px 16px;border-radius:12px;display:flex;gap:14px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.2);max-width:calc(100% - 32px)}\n.toast button{border:0;background:transparent;color:var(--bg);font-weight:700;text-decoration:underline;padding:0}\n@media (prefers-reduced-motion: reduce){*{transition:none!important}}\n/* v2: list view. Sections are plain headers; every item is its own card. */\n.main{gap:26px}\n.main > section.card{background:none;box-shadow:none;padding:0;border-radius:0}\n.main > section.card > h2{font-size:13.5px;font-weight:650;margin:0 0 9px 2px;gap:8px;padding-right:30px}\n.main > section.card > h2 .dot{position:static;width:8px;height:8px;margin:0;flex:none}\n.dot.ring,.kcol h2 i.ring{background:transparent;border:1.6px solid var(--s-later);box-sizing:border-box}\n.main > section.card > h2 .count{background:none;padding:0;min-width:0;height:auto;color:var(--faint);font-weight:500}\n.main > section.card > ul{display:grid;gap:8px}\n.main > section.card > ul > .empty{padding:2px 2px 4px;font-size:13.5px}\n.item{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:11px 14px 12px;display:grid;gap:8px;min-width:0;box-shadow:none}\n.main .item:hover{border-color:var(--line-strong)}\n.item.dragging{opacity:.4}\n.ihead{display:flex;align-items:flex-start;gap:8px;min-width:0}\n.ihead .title{flex:1;min-width:0;font-size:14.5px;font-weight:600;line-height:20px;color:var(--fg);overflow-wrap:anywhere}\n.ihead .title.drag{cursor:grab}\n.ihead .who{flex:none;margin:1px 0 0;font-size:11.5px;font-weight:650;line-height:18px;padding:0 8px;vertical-align:0;background:var(--wait-soft);color:var(--wait-text)}\n.ihead .new-tag{flex:none;margin-top:1px}\n.ihead .menu-wrap{position:relative;flex:none}\n.ihead .more{border:0;background:none;padding:0;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;color:var(--faint);font-size:16px;font-weight:700;letter-spacing:0;line-height:1;cursor:pointer;border-radius:4px}\n.ihead .more:hover,.ihead .more[aria-expanded=\"true\"]{color:var(--fg);background:none}\n.ihead .menu{left:auto;right:0;top:calc(100% + 4px)}\n.menu button{border:0;background:none;text-align:left;padding:8px 10px;border-radius:8px;font:inherit;font-size:13.5px;font-weight:500;color:var(--fg);cursor:pointer}\n.menu button:hover{background:var(--accent-soft)}\n.menu button.danger{color:var(--wait-text)}\n.menu button.danger:hover{background:var(--wait-soft)}\n.links{margin:0;gap:6px}\n.link-pill,.prio,.chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--soft);text-decoration:none;line-height:18px;padding:1px 9px 1px 7px;border-radius:999px;border:1px solid var(--line);background:var(--surface)}\n.link-pill svg,.chip svg,.prio svg{width:13px;height:13px;flex:none}\n.link-pill:hover{color:var(--fg);border-color:var(--line-strong)}\n.link-pill.icon-only{padding:1px 6px}\n.chip.who{background:var(--wait-soft);color:var(--wait-text);border-color:transparent;padding:1px 9px}\n.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;font-weight:500}\n.item .note{margin:0;font-size:13.5px}\n.subs-box{border-top:1px solid var(--line);padding-top:6px}\n.subs-box .subs{margin:0}\n.sub.done .check{background:var(--faint);border-color:var(--faint)}\n.sub.leaving{opacity:.45;transition:opacity .4s}\n.sub.done .sub-t{color:var(--faint);text-decoration:line-through}\n.done-toggle:hover{color:var(--soft)}\n.folds{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:flex-start}\n.folds .ctx{margin:0;padding:0;background:none;cursor:default}\n.folds .ctx.open{flex-basis:100%;padding:8px 12px 10px;background:var(--bg);border-radius:8px}\n.folds .ctx-h{width:auto;gap:4px;font-size:12.5px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--soft)}\n.folds .ctx-h:hover{color:var(--fg)}\n.folds .ctx-h svg{width:13px;height:13px;transform:none}\n.folds .ctx.open .ctx-h svg{transform:rotate(180deg)}\n.kick-wrap{display:grid;gap:6px}\n.kick-wrap > button.go{width:max-content;border:0;border-radius:8px;padding:5px 11px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;background:var(--accent-soft);color:var(--accent)}\n.kick-wrap > button.go:hover{background:var(--accent);color:var(--surface)}\n.kcol{background:transparent;box-shadow:none;padding:4px 2px}\n.kcol h2 i{width:8px;height:8px}\n.kcard{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px 10px;gap:7px;font-size:13px;cursor:pointer}\n.kcard:hover{box-shadow:none;border-color:var(--line-strong)}\n.kcard .ihead .title{font-size:13.5px;line-height:19px}\n.kcard .link-pill,.kcard .chip,.kcard .prio{font-size:11.5px;padding:0 7px;line-height:18px}\n#drawerBody .item{border:0;padding:0}\n.main > section.card.foldable.collapsed > :not(h2){display:none}\n.main > section.card.foldable.collapsed > h2{margin-bottom:0}\n.sec-sum{display:none;flex:1;min-width:0;font-size:12.5px;font-weight:500;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.main > section.foldable.collapsed .sec-sum{display:block}\n.main > section.card > h2 .count{display:none}\n.cbtn{flex:none;width:20px;height:20px;border:0;background:none;padding:0;display:inline-flex;align-items:center;justify-content:center;color:var(--faint);cursor:pointer;border-radius:4px}\n.cbtn svg{width:15px;height:15px;transition:transform .15s}\n.cbtn:hover{color:var(--fg)}\n.item.collapsed .cbtn svg{transform:rotate(-90deg)}\n.item.collapsed > .note,.item.collapsed > .read-more,.item.collapsed > .subs-box,.item.collapsed > .folds{display:none}\n#drawerBody .cbtn{display:none}\n#drawerBody .item.collapsed > *{display:revert}\n\n/* shared-dashboard additions */\n.ws-row{margin-top:12px}\n.ws-switch button{font-weight:700}\n.ihead .main-check{width:18px;height:18px;border-radius:50%;margin-top:1px}\n.ihead .main-check.on{background:var(--accent);border-color:var(--accent)}\n.item.leaving,.kcard.leaving{opacity:.45;transition:opacity .3s}\n.ver{margin:10px 4px 0;font-size:11.5px;color:var(--faint)}\n"; document.head.appendChild(styleEl);
  const accentEl = document.createElement("style"); document.head.appendChild(accentEl);
  if(!document.querySelector('link[href*="Figtree"]')){
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap"; document.head.appendChild(l);
  }
  const root = document.getElementById("dashboard") || document.body.appendChild(document.createElement("div"));
  root.innerHTML = "<div class=\"wrap\">\n  <header>\n    <div>\n      <div class=\"kicker\" id=\"refreshed\">Hi</div>\n      <h1 id=\"date\">Dashboard</h1>\n      <div class=\"ws-row\"><div class=\"view-toggle ws-switch\" id=\"wsSwitch\" role=\"group\" aria-label=\"Workspace\" hidden></div></div>\n    </div>\n    <div class=\"head-right\">\n      <div class=\"view-toggle\" role=\"group\" aria-label=\"View\"><button type=\"button\" data-view=\"list\">List</button><button type=\"button\" data-view=\"board\">Board</button></div>\n      <div class=\"view-toggle\"><button type=\"button\" id=\"activeOnly\" aria-pressed=\"false\">Active only</button></div>\n      <div class=\"view-toggle\"><button type=\"button\" id=\"collapseAll\" title=\"Show just the titles and buttons, or everything\">Collapse all</button></div>\n      <button class=\"clear-new\" type=\"button\" id=\"clearNew\" hidden>Clear new</button>\n      <span class=\"update-wrap\"><button class=\"update-state\" id=\"updateState\" type=\"button\" aria-describedby=\"updateTip\"></button><span class=\"update-tip\" id=\"updateTip\" role=\"tooltip\" hidden></span></span>\n      <button class=\"link-chats\" type=\"button\" id=\"updateBtn\" hidden><svg viewBox=\"0 0 16 16\" aria-hidden=\"true\"><path d=\"M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg><span id=\"updateLabel\">Update</span></button>\n    </div>\n    <div class=\"status\" id=\"status\" hidden></div>\n  </header>\n  <div class=\"grid\">\n    <div class=\"board\" id=\"board\" aria-label=\"Board view\"></div>\n    <div class=\"main\" id=\"main\"></div>\n    <aside class=\"rail\">\n      <section class=\"card\">\n        <h2 id=\"railTitle\">Today</h2>\n        <ul id=\"meetings\"><li class=\"empty\">Loading today's calendar…</li></ul>\n      </section>\n      <p class=\"ver\"><span id=\"wsName\"></span> <span id=\"ver\"></span></p>\n    </aside>\n  </div>\n</div>\n<div class=\"drawer-back\" id=\"drawerBack\" hidden></div>\n<aside class=\"drawer\" id=\"drawer\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Item details\" aria-hidden=\"true\">\n  <div class=\"drawer-head\"><span class=\"drawer-sec\" id=\"drawerSec\"></span><button type=\"button\" class=\"drawer-close\" id=\"drawerClose\" aria-label=\"Close details\"><svg viewBox=\"0 0 16 16\" aria-hidden=\"true\"><path d=\"M4 4l8 8M12 4l-8 8\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg></button></div>\n  <ul id=\"drawerBody\"></ul>\n</aside>\n<div class=\"toast\" id=\"toast\" hidden><span id=\"toastMsg\"></span><button id=\"toastUndo\" type=\"button\">Undo</button></div>\n";

  const $ = id => document.getElementById(id);
  const SVG = d => '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + d + '</g></svg>';
  const ICON = {
    figma: SVG('<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 6h11M6 6v7.5"/>'),
    chat: SVG('<path d="M8 2v3.2M8 10.8V14M2 8h3.2M10.8 8H14M3.8 3.8l2.2 2.2M10 10l2.2 2.2M12.2 3.8L10 6M6 10l-2.2 2.2"/>'),
    link: SVG('<path d="M7 9a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.6.6M9 7a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.6-.6"/>'),
    todo: SVG('<rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><path d="M5.5 8l1.8 1.8L10.5 6"/>'),
    notes: SVG('<path d="M4 2.5h6l2.5 2.5v8.5H4z"/><path d="M6.5 7h4M6.5 9.5h4"/>'),
    cal: SVG('<rect x="2.5" y="3.5" width="11" height="10" rx="2"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/>')
  };
  const CHEV = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function el(tag, cls, text){ const e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function safeUrl(u){ return typeof u === "string" && /^https:\/\//.test(u) ? u : null; }
  const store = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch(_){ return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(_){} };
  function setStatus(msg){ const s = $("status"); s.textContent = msg || ""; s.hidden = !msg; }

  /* ---------- workspace ---------- */
  let WS = null;
  let SECTIONS = [], LABEL = {}, EMPTY = {}, DRAGGABLE = [], PRIMARY = {};
  const feat = k => !!(WS && WS.features && WS.features[k]);
  function wsFromHash(){ const h = (location.hash || "").slice(1); return WORKSPACES.find(w => w.id === h); }
  function pickInitial(){ return wsFromHash() || WORKSPACES.find(w => w.id === store("dash.ws", "")) || WORKSPACES[0]; }
  function applyWorkspace(w){
    WS = w;
    LABELS = Object.assign({}, BASE_LABELS, w.labels || {});
    // Section names are the Todoist label names, so the dashboard and Todoist always say the same thing.
    const names = Object.assign({upcoming: "To do", today: LABELS.today, ready: LABELS.ready, waiting: LABELS.waiting, handoff: LABELS.handoff, later: LABELS.later}, w.sections || {});
    LABEL = Object.assign({}, names, {done: "Complete", removed: "Removed"});
    SECTIONS = ["today", "ready", "waiting"].concat(feat("handoff") ? ["handoff"] : [], ["upcoming", "later"]);
    DRAGGABLE = ["today", "upcoming", "later"].concat(feat("handoff") ? ["handoff"] : []);
    EMPTY = {today: "Nothing in progress.", ready: "Nothing here.", waiting: "Not waiting on anyone.", handoff: "Nothing waiting for a handoff.", upcoming: "Nothing to do.", later: "Nothing parked for later."};
    PRIMARY = {today: [names.ready, "ready"], ready: ["Back to " + names.today.toLowerCase(), "today"], waiting: ["Back to " + names.today.toLowerCase(), "today"],
      handoff: ["Handed off", "done"], upcoming: ["Start", "today"], later: ["Start", "today"], done: ["Reopen", "today"]};
    // accent colour per workspace (light and dark)
    const a = /^#[0-9a-f]{6}$/i.test(w.accent || "") ? w.accent : null;
    accentEl.textContent = a ? ':root{--accent:' + a + ';--accent-soft:color-mix(in srgb,' + a + ' 12%,#fff)}' +
      '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--accent:color-mix(in srgb,' + a + ' 55%,#fff);--accent-soft:color-mix(in srgb,' + a + ' 22%,#1A1D24)}}' +
      ':root[data-theme="dark"]{--accent:color-mix(in srgb,' + a + ' 55%,#fff);--accent-soft:color-mix(in srgb,' + a + ' 22%,#1A1D24)}' : "";
    save("dash.ws", w.id);
    if(WORKSPACES.length > 1 && location.hash.slice(1) !== w.id){ try { history.replaceState(null, "", "#" + w.id); } catch(_){} }
    buildSections(); renderSwitcher();
    $("railTitle").textContent = "Today";
    $("activeOnly").title = "Show only " + ["today", "ready", "waiting"].concat(feat("handoff") ? ["handoff"] : []).map(s => LABEL[s]).join(", ");
    $("updateLabel").textContent = "Update";
    const stored = cache[w.id] ? null : readCache(w.id);
    items = cache[w.id] || (stored ? stored.items : []);
    const calStored = store("dash.cal." + w.id, null);
    dayData = calStored && calStored.date === isoDay(new Date()) ? calStored : null;
    statusDoc = null; renderStatus(); watchStatus();
    render();
    if(!items.length && db){ readDbCache(w.id).then(list => { if(list && w === WS && !cache[w.id] && !items.length){ items = list; render(); } }); }
    clearTimeout(slowTimer);
    if(!items.length && mcp) slowTimer = setTimeout(() => { if(!items.length && w === WS) setStatus("Loading your to-dos…"); }, 1500);
    if(mcp){ loadTasks(); loadCalendar(); }
  }
  let slowTimer = null;
  function renderSwitcher(){
    const box = $("wsSwitch"); box.replaceChildren(); box.hidden = WORKSPACES.length < 2;
    WORKSPACES.forEach(w => { const b = el("button", null, w.name || w.id); b.type = "button"; b.setAttribute("aria-pressed", String(w === WS)); b.onclick = () => { if(w !== WS){ closeDrawer(); applyWorkspace(w); } }; box.append(b); });
    $("wsName").textContent = WORKSPACES.length > 1 ? (WS.name || "") : "";
  }
  window.addEventListener("hashchange", () => { const w = wsFromHash(); if(w && w !== WS) applyWorkspace(w); });

  const SEC_COLOR = {upcoming: "var(--s-todo)", today: "var(--s-prog)", ready: "var(--s-ready)", waiting: "var(--s-wait)", handoff: "var(--s-hand)", later: "ring", done: "var(--s-done)"};
  let foldedSecs = store("brief.foldedSections", []);
  function buildSections(){
    const main = $("main"); main.replaceChildren();
    ["upcoming", "today", "ready", "waiting"].concat(feat("handoff") ? ["handoff"] : [], ["later", "completed"]).forEach(key => {
      const sec = key === "completed" ? "done" : key;
      const card = el("section", "card foldable" + (key === "completed" ? " completed-card" : "")); card.dataset.key = key;
      const h = el("h2"); const dot = el("span", "dot"); if(SEC_COLOR[sec] === "ring") dot.classList.add("ring"); else dot.style.background = SEC_COLOR[sec];
      const label = key === "completed" ? "Completed" : LABEL[sec];
      h.append(dot, document.createTextNode(label + " "), Object.assign(el("span", "count"), {id: key === "completed" ? "c-complete" : "c-" + sec}));
      const ul = el("ul"); ul.id = key === "completed" ? "list-complete" : "list-" + sec; if(key !== "completed") ul.dataset.section = sec;
      card.append(h, ul); main.append(card);
      const chev = el("button", "chev"); chev.type = "button"; chev.innerHTML = CHEV;
      const set = c => { card.classList.toggle("collapsed", c); chev.setAttribute("aria-expanded", String(!c)); chev.setAttribute("aria-label", (c ? "Expand " : "Collapse ") + label); };
      set(foldedSecs.includes(key));
      const toggle = () => { const c = !card.classList.contains("collapsed"); foldedSecs = foldedSecs.filter(k => k !== key); if(c) foldedSecs.push(key); save("brief.foldedSections", foldedSecs); set(c); if(!c) requestAnimationFrame(fixClamps); };
      chev.onclick = e => { e.stopPropagation(); toggle(); }; h.addEventListener("click", toggle); h.append(chev);
      if(DRAGGABLE.includes(sec)) wireListDrag(ul);
    });
  }

  /* ---------- state ---------- */
  let db = null, mcp = null, items = [], canWrite = true, undoState = null, toastTimer = null, refreshTimer = null;
  const cache = {};
  const CACHE_V = 1;
  const lastSaved = {};
  function saveCache(wsId, list){
    const body = JSON.stringify(list);
    if(lastSaved[wsId] === body) return; lastSaved[wsId] = body;
    try { localStorage.setItem("dash.cache." + wsId, JSON.stringify({v: CACHE_V, t: Date.now(), items: list})); } catch(_){}
    if(db && body.length < 400000){ try { db.doc("cache/" + wsId).set({v: CACHE_V, t: Date.now(), items: body}).catch(() => {}); } catch(_){} }
  }
  async function readDbCache(wsId){
    if(!db) return null;
    try { const sn = await db.doc("cache/" + wsId).get(); const c = sn && sn.exists ? sn.data() : null; return c && c.v === CACHE_V ? JSON.parse(c.items) : null; } catch(_){ return null; }
  }
  function readCache(wsId){ try { const c = JSON.parse(localStorage.getItem("dash.cache." + wsId) || "null"); return c && c.v === CACHE_V && Array.isArray(c.items) ? c : null; } catch(_){ return null; } }
  const seenMap = store("pd.seen", {}), orderMap = store("pd.order", {});
  function saveSeen(id, t){ seenMap[id] = t; save("pd.seen", seenMap); }
  function saveOrder(id, o){ orderMap[id] = o; save("pd.order", orderMap); }
  const collapsedIds = new Set(store("brief.collapsed", []));
  function saveCollapsed(){ save("brief.collapsed", [...collapsedIds]); }
  const expanded = new Set();
  function sorted(section){ return items.filter(i => i.section === section).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.title).localeCompare(String(b.title))); }

  /* ---------- Todoist adapter ---------- */
  const STATUS_KEYS = ["today", "ready", "waiting", "later", "handoff", "meeting"];
  const statusLabels = () => STATUS_KEYS.map(k => LABELS[k]);
  const parse = r => {
    const p = r && r.payload; if(p && typeof p === "object") return p;
    const txt = typeof p === "string" ? p : ((r && r.content) || []).filter(c => c.type === "text").map(c => c.text)[0] || "";
    try { return JSON.parse(txt); } catch(_){ const m = txt.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : {}; } catch(_){ return {}; } }
  };
  const td = (tool, input) => mcp.callTool(CFG.todoistServer || "Todoist", tool, input, {cache: false});
  const KEYLINE = /^(Waiting on|Link|Figma|Notion|Chat|Meeting):[ \t]*(.*)$/;
  function splitDesc(desc){
    const [head, ctx = ""] = String(desc || "").split(/^Context:[ \t]*$/m);
    const keys = {}, rest = [];
    head.split("\n").forEach(line => { const m = line.match(KEYLINE); if(m) keys[m[1]] = m[2].trim(); else rest.push(line); });
    return {keys, note: rest.join("\n").trim(), ctx};
  }
  function setLine(desc, key, val){
    const [head, ...tail] = String(desc || "").split(/^(?=Context:[ \t]*$)/m);
    const re = new RegExp("^" + key + ":.*(\\n|$)", "m");
    let h = head.replace(re, "");
    if(val) h = key + ": " + val + (h ? "\n" + h : "");
    return (h + (tail.length ? (h && !h.endsWith("\n") ? "\n" : "") + tail.join("") : "")).replace(/\n{3,}/g, "\n\n");
  }
  const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function toItem(t, i, kids){
    const labels = Array.isArray(t.labels) ? t.labels : [];
    const {keys, note: noteText, ctx} = splitDesc(t.description);
    const prio = {p1: "Urgent", p2: "High", p3: "Medium"}[t.priority];
    let note = noteText; if(prio) note = prio + " priority. " + note;
    const log = ctx.split("\n").map(x => x.replace(/^\s*[-*]\s*/, "").trim()).filter(Boolean).map(x => ({t: x}));
    const has = k => labels.includes(LABELS[k]);
    const section = has("meeting") ? "meeting" : has("today") ? "today" : has("ready") ? "ready" : has("waiting") ? "waiting" : (has("handoff") && feat("handoff")) ? "handoff" : has("later") ? "later" : "upcoming";
    const dueRaw = t.dueDate || (t.due && (t.due.date || t.due.string)) || "";
    let due = "", overdue = false;
    if(dueRaw){
      const d = new Date(String(dueRaw).length <= 10 ? dueRaw + "T12:00:00" : dueRaw);
      if(!isNaN(d)){ due = d.toLocaleDateString("en-US", {weekday: "short", month: "short", day: "numeric"}); const t0 = new Date(); t0.setHours(0, 0, 0, 0); overdue = d < t0; }
      else due = String(dueRaw);
    }
    const isQ = k => Array.isArray(k.labels) && k.labels.includes(LABELS.question);
    const subtasks = kids.filter(k => !isQ(k)).map(k => ({id: k.id, t: k.content, d: !!k.checked, n: Date.parse(k.addedAt) || 0, seen: !!seenMap[k.id],
      notes: String(k.description || "").split("\n").map(x => x.replace(/^\s*[-*]\s*/, "").trim()).filter(Boolean).map(x => ({t: x}))}));
    const questions = kids.filter(isQ).map(k => ({id: k.id, t: k.content, d: !!k.checked}));
    return {id: t.id, title: t.content, description: String(t.description || ""), labels, section, order: orderMap[t.id] ?? (i + 1), projectId: t.projectId,
      note, log, subtasks, questions, _server: subtasks.concat(questions).map(x => ({id: x.id, d: x.d})),
      waitingOn: keys["Waiting on"] || "", url: safeUrl(keys.Link) || "https://app.todoist.com/app/task/" + t.id, todoistUrl: "https://app.todoist.com/app/task/" + t.id,
      figma: safeUrl(keys.Figma), notion: safeUrl(keys.Notion), chat: safeUrl(keys.Chat), meeting: keys.Meeting || "", due, overdue, newAt: Date.parse(t.addedAt) || 0, seenAt: seenMap[t.id] || 0};
  }
  function projectIds(){ const t = WS.todoist || {}; return [].concat(t.projectIds || [], t.projectId || []).filter(Boolean); }
  let loadSeq = 0;
  let lastLoad = 0;
  async function loadTasks(){
    if(!mcp) return;
    lastLoad = Date.now();
    const w = WS, seq = ++loadSeq, pids = projectIds();
    if(!pids.length){ setStatus("This workspace has no Todoist project set in its settings."); return; }
    try {
      const results = await Promise.all(pids.map(pid => Promise.all([
        td("find-tasks", {projectId: pid, limit: 100}),
        td("find-completed-tasks", {projectId: pid, limit: 30}).catch(() => null)
      ])));
      if(seq !== loadSeq || w !== WS) return;
      const next = [];
      results.forEach(([act, comp]) => {
        const all = parse(act).tasks || [], ids = new Set(all.map(t => t.id));
        const desc = id => all.filter(k => k.parentId === id).flatMap(k => [k, ...desc(k.id)]);
        all.filter(t => !t.parentId || !ids.has(t.parentId)).forEach((t, i) => next.push(toItem(t, i, desc(t.id))));
        const done = comp ? (parse(comp).tasks || []).filter(t => !t.parentId) : [];
        done.forEach(t => next.push({id: t.id, title: t.content, section: "done", _completed: true, labels: t.labels || [], description: String(t.description || ""), touchedAt: Date.parse(t.completedAt) || 0, subtasks: [], questions: [], _server: []}));
      });
      items = next; cache[w.id] = next; saveCache(w.id, next); setStatus(""); render();
      ensureNotesPages(w).catch(() => {});
    } catch(e){
      if(w !== WS) return;
      const c = e && e.code;
      setStatus(c === "server_not_connected" || c === "needs_reauth" ? "Connect Todoist in Settings → Connectors to see your to-dos." :
        c === "not_in_manifest" || c === "approval_required" || c === "cancelled" ? "This page needs your OK to read Todoist. Reload and allow it." :
        "Couldn't reach Todoist. Trying again shortly.");
      scheduleRefresh(60000);
    }
  }
  function scheduleRefresh(ms){ clearTimeout(refreshTimer); refreshTimer = setTimeout(loadTasks, ms || 1500); }

  async function write(id, patch){
    const it = items.find(i => i.id === id); if(!it || !mcp) return;
    try {
      for(const key of ["subtasks", "questions"]){
        if(!(key in patch)) continue;
        const server = it._server || [];
        for(const ns of patch[key]){
          const cur = server.find(x => x.id === ns.id); if(!cur || !!cur.d === !!ns.d) continue;
          await td(ns.d ? "complete-tasks" : "uncomplete-tasks", {ids: [ns.id]}); cur.d = !!ns.d;
        }
      }
      let desc = it.description, labels = null;
      if("section" in patch){
        const s = patch.section;
        if(s === "done"){ await td("complete-tasks", {ids: [id]}); it._completed = true; markNotesDone(it); }
        else if(s === "removed"){ await td("delete-object", {type: "task", id}); }
        else {
          if(it._completed){ await td("uncomplete-tasks", {ids: [id]}); it._completed = false; }
          labels = (it.labels || []).filter(l => !statusLabels().includes(l)); if(LABELS[s]) labels.push(LABELS[s]);
          desc = setLine(desc, "Waiting on", s === "waiting" ? (patch.waitingOn || it.waitingOn) : null);
          desc = setLine(desc, "Meeting", s === "meeting" ? (patch.meeting || it.meeting) : null);
        }
      } else if("waitingOn" in patch) desc = setLine(desc, "Waiting on", patch.waitingOn);
      if("chat" in patch) desc = setLine(desc, "Chat", patch.chat);
      if("notion" in patch) desc = setLine(desc, "Notion", patch.notion);
      const up = {id};
      if(labels){ up.labels = labels; it.labels = labels; }
      if(desc !== it.description){ up.description = desc; it.description = desc; }
      if(Object.keys(up).length > 1) await td("update-tasks", {tasks: [up]});
      if("order" in patch && patch.order != null && !["done", "removed"].includes(patch.section)){
        saveOrder(id, patch.order);
        if(!("section" in patch)) await td("update-tasks", {tasks: [{id, order: patch.order}]});
      }
      setStatus("");
    } catch(e){
      setStatus(e && (e.code === "server_not_connected" || e.code === "needs_reauth") ? "Reconnect Todoist in Settings → Connectors." : "Couldn't save that change to Todoist. Try again in a moment.");
    }
    scheduleRefresh();
  }

  /* ---------- automatic Notion notes pages for projects ----------
     A workspace with notes:{dataSource} gets one Notion page per project task, created by the page itself (no Claude tokens).
     notes.all = every task is a project (client work); otherwise a task becomes a project at notes.minSteps steps (default 3). */
  const notionCall = (tool, input) => mcp.callTool(CFG.notionServer || "Notion", tool, input, {cache: false});
  const notesTried = store("dash.notesTried", {});
  function isProject(w, it){
    const n = w.notes; if(!n || !n.dataSource) return false;
    if(it.notion || !["today", "ready", "waiting", "handoff", "upcoming", "later"].includes(it.section)) return false;
    return n.all || (it.subtasks || []).length >= (n.minSteps || 3);
  }
  function notesMarkdown(it){
    const out = [];
    const links = [["Todoist", it.todoistUrl], ["Figma", it.figma], ["Source", it.url !== it.todoistUrl ? it.url : null], ["Chat", it.chat]].filter(x => safeUrl(x[1]));
    if(links.length) out.push(links.map(([k, u]) => "[" + k + "](" + u + ")").join(" · "), "");
    const pr = priorityOf(it.note); const note = pr ? pr.rest : it.note;
    if(note) out.push(note, "");
    if((it.log || []).length){ out.push("## Context"); it.log.forEach(x => out.push("- " + x.t)); out.push(""); }
    if((it.subtasks || []).length){ out.push("## Steps when this page was made"); it.subtasks.forEach(x => out.push("- [" + (x.d ? "x" : " ") + "] " + x.t)); out.push(""); }
    out.push("## Notes", "Longer notes, meeting discussions and decisions for this project go here.");
    return out.join("\n");
  }
  let notesBusy = false;
  async function ensureNotesPages(w){
    if(notesBusy || !mcp || !w.notes || !w.notes.dataSource) return;
    const due = items.filter(it => isProject(w, it) && !(Date.now() - (notesTried[it.id] || 0) < 24 * 3600 * 1000)).slice(0, 3);
    if(!due.length) return;
    notesBusy = true;
    try {
      for(const it of due){
        notesTried[it.id] = Date.now(); save("dash.notesTried", notesTried);
        const props = {Name: it.title, Status: "Active", Todoist: it.todoistUrl};
        if(w.notes.figmaProp && it.figma) props[w.notes.figmaProp] = it.figma;
        const r = await notionCall("notion-create-pages", {parent: {data_source_id: w.notes.dataSource}, pages: [{properties: props, content: notesMarkdown(it)}], allow_async: false});
        const txt = JSON.stringify(r && (r.payload || r.content) || "");
        const m = txt.match(/https:\/\/(?:app\.|www\.)?notion\.(?:so|com)\/[^\s"'<>)\\]+/);
        if(!m) continue;
        const url = m[0].replace(/\?pvs=\d+$/, "");
        it.notion = url; await write(it.id, {notion: url});
      }
    } finally { notesBusy = false; }
  }
  async function markNotesDone(it){
    if(!it.notion || !mcp || !(WS.notes && WS.notes.dataSource)) return;
    try { await notionCall("notion-update-page", {page_id: it.notion, command: "update_properties", properties: {Status: "Done"}}); } catch(_){}
  }

  /* ---------- calendar ---------- */
  let dayData = null;
  async function loadCalendar(){
    const c = WS.calendar; const w = WS;
    if(!mcp || c === false){ dayData = {date: isoDay(new Date()), meetings: [], off: true}; renderMeetings(); return; }
    const n = new Date(), tom = new Date(n); tom.setDate(n.getDate() + 1);
    const ids = (c && c.ids) || ["primary"], hide = ((c && c.hide) || []).map(x => String(x).toLowerCase());
    try {
      const lists = await Promise.all(ids.map(id => mcp.callTool(CFG.calendarServer || "Google Calendar", "list_events",
        Object.assign({startTime: isoDay(n) + "T00:00:00", endTime: isoDay(tom) + "T00:00:00", orderBy: "startTime", pageSize: 50}, id === "primary" ? {} : {calendarId: id}), {cache: false})));
      if(w !== WS) return;
      const fmt = s => new Date(s).toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"});
      const evs = lists.flatMap(r => { const p = parse(r); return p.events || p.items || []; })
        .filter(e => e && e.status !== "cancelled" && !hide.some(h => String(e.summary || "").toLowerCase().includes(h)))
        .filter(e => !(c && c.acceptedOnly) || !(e.attendees || []).some(a => a.self && a.responseStatus === "declined"))
        .sort((a, b) => String((a.start || {}).dateTime || (a.start || {}).date).localeCompare(String((b.start || {}).dateTime || (b.start || {}).date)));
      dayData = {date: isoDay(n), meetings: evs.map((e, i) => { const st = e.start || {}, en = e.end || {};
        return {id: e.id || "e" + i, title: e.summary || "(No title)", url: e.htmlLink, time: st.dateTime ? fmt(st.dateTime) + (en.dateTime ? " – " + fmt(en.dateTime) : "") : "All day"}; })};
      save("dash.cal." + w.id, dayData);
    } catch(e){ if(w !== WS) return; dayData = {date: isoDay(n), meetings: [], error: true}; }
    renderMeetings();
  }
  const isoDay = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  function meetingsList(){ return dayData && Array.isArray(dayData.meetings) ? dayData.meetings : []; }
  const meetingMatches = (ask, m) => { const a = slug(ask), t = slug(m.title); return !!a && (a === t || t.includes(a) || a.includes(t)); };

  /* ---------- card ---------- */
  function menuOpts(it, section, anchor){
    const opts = [], seen = new Set();
    const add = (label, target, cls) => { const k = typeof target === "string" ? target : label; if(seen.has(k)) return; seen.add(k); opts.push([label, target, cls]); };
    const p = PRIMARY[section]; if(p) add(p[0], p[1]);
    if(section !== "ready") add(LABEL.ready, "ready");
    add(section === "waiting" ? "Change who it's waiting on" : "Waiting on…", () => askWaiting(it, anchor));
    if(feat("handoff") && section !== "handoff") add("Move to " + LABEL.handoff, "handoff");
    if(feat("meetingAsks") && section === "today") meetingsList().forEach(m => opts.push(["Bring up at " + (m.title || "meeting"), {section: "meeting", meeting: m.title}]));
    if(section !== "today") add("Move to " + LABEL.today, "today");
    if(section !== "upcoming") add("Move to " + LABEL.upcoming, "upcoming");
    if(section !== "later") add("Move to " + LABEL.later, "later");
    if(section !== "done") add("Mark complete", "done");
    add("Open in Todoist", () => { try { window.open(it.todoistUrl, "_blank"); } catch(_){} });
    add("Delete", "removed", "danger");
    return opts;
  }
  async function openChat(url){
    try { const w = window.open(url, "_blank"); if(w){ try { w.opener = null; } catch(_){} return; } } catch(_){}
    let copied = false; try { await navigator.clipboard.writeText(url); copied = true; } catch(_){}
    toast(copied ? "Couldn't open the chat here. Its link is copied." : "Couldn't open the chat here: " + url);
  }
  function chipRow(it, opts){
    const o = opts || {};
    const row = el("div", "links"); row.addEventListener("click", () => markSeen(it));
    if(o.who && it.waitingOn) row.append(el("span", "chip who", it.waitingOn));
    const pr = priorityOf(it.note); if(pr) row.append(prioTag(pr.p));
    if(it.due){ const d = el("span", "chip" + (it.overdue ? " who" : "")); d.innerHTML = ICON.cal; d.append(document.createTextNode(it.due)); d.title = it.overdue ? "Overdue" : "Due date"; row.append(d); }
    const pill = (url, label, icon, aria) => { const a = el("a", "link-pill"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.innerHTML = icon; if(label) a.append(el("span", null, label)); else { a.setAttribute("aria-label", aria); a.classList.add("icon-only"); } row.append(a); };
    const u = safeUrl(it.url); if(u) pill(u, "Link", ICON.link, "Link");
    const f = safeUrl(it.figma), c = safeUrl(it.chat);
    if(f) pill(f, o.compact ? "" : "Figma", ICON.figma, "Figma");
    const nn = safeUrl(it.notion); if(nn) pill(nn, o.compact ? "" : "Notes", ICON.notes, "Notion notes");
    if(c){ pill(c, o.compact ? "" : "Chat", ICON.chat, "Claude chat"); const a = row.lastChild; a.onclick = e => { e.preventDefault(); e.stopPropagation(); openChat(c); }; }
    const subs = it.subtasks || [];
    if(subs.length){ const n = el("span", "chip"); n.innerHTML = ICON.todo; n.append(document.createTextNode(subs.filter(x => x && x.d).length + "/" + subs.length)); n.title = "To-dos done"; row.append(n); }
    return row.childNodes.length ? row : null;
  }
  function handoffEl(it, section){
    if(!feat("handoff") || section !== "handoff") return null;
    const wrap = el("div", "kick-wrap");
    const b = el("button", "go", "Copy handoff prompt"); b.type = "button"; b.title = "Copies the prompt and opens the task's chat";
    b.onclick = async e => {
      e.stopPropagation();
      const parts = [(it.title || "") + ": write the dev handoff."];
      if(safeUrl(it.url) && it.url !== it.todoistUrl) parts.push("Link: " + it.url);
      if(safeUrl(it.figma)) parts.push("Figma page: " + it.figma);
      parts.push("Todoist task: " + it.todoistUrl);
      parts.push("Use the decisions on the task (subtask notes and context) and in this chat, and draft it here first.");
      const msg = parts.join("\n"); let copied = false;
      try { await navigator.clipboard.writeText(msg); copied = true; } catch(_){}
      const chat = safeUrl(it.chat); let opened = false;
      if(chat){ try { const w = window.open(chat, "_blank"); if(w){ try { w.opener = null; } catch(_){} opened = true; } } catch(_){} }
      toast(!copied ? "Couldn't copy. Prompt: " + msg.replace(/\n/g, " ") : opened ? "Handoff prompt copied. Paste it into the chat." : chat ? "Handoff prompt copied. Open the task's chat and paste it." : "Handoff prompt copied. Paste it into a new chat.");
    };
    wrap.append(b); return wrap;
  }
  function mainCheck(it){
    const c = el("button", "check main-check"); c.type = "button"; c.disabled = !canWrite;
    c.setAttribute("aria-label", "Mark complete: " + (it.title || ""));
    c.title = "Mark complete";
    c.onclick = e => { e.stopPropagation(); const li = c.closest(".item,.kcard"); if(li) li.classList.add("leaving"); c.classList.add("on"); setTimeout(() => change(it, {section: "done"}), li ? 350 : 0); };
    return c;
  }
  function renderItem(it, section){
    const li = el("li", "item"); li.dataset.id = it.id;
    const head = el("div", "ihead");
    if(canWrite) head.append(mainCheck(it));
    const t = el("span", "title", it.title || "Untitled");
    if(DRAGGABLE.includes(section) && canWrite){ t.draggable = true; t.classList.add("drag"); }
    head.append(t);
    if(section === "waiting" && it.waitingOn) head.append(el("span", "who", it.waitingOn));
    if(isNew(it)) head.append(newTag());
    const cb = el("button", "cbtn"); cb.type = "button"; cb.innerHTML = CHEV;
    const set = c => { li.classList.toggle("collapsed", c); cb.setAttribute("aria-expanded", String(!c)); cb.setAttribute("aria-label", (c ? "Show details for " : "Hide details for ") + (it.title || "item")); };
    set(collapsedIds.has(it.id));
    cb.onclick = e => { e.stopPropagation(); const c = !li.classList.contains("collapsed"); if(c) collapsedIds.add(it.id); else collapsedIds.delete(it.id); saveCollapsed(); set(c); updateCollapseAll(); if(!c) requestAnimationFrame(fixClamps); };
    head.append(cb);
    if(canWrite) head.append(moreMenu(it, menuOpts(it, section, head)));
    li.append(head);
    const chips = chipRow(it); if(chips) li.append(chips);
    { const pr = priorityOf(it.note); const nt = pr ? pr.rest : it.note; if(nt) li.append(noteEl("p", "note", nt, it.id)); }
    const subs = it.subtasks || [];
    if(subs.length){
      const doneN = subs.filter(s => s && s.d).length;
      const box = el("div", "subs-box"), ul = el("ul", "subs");
      const showDone = expanded.has(it.id + ":done");
      subs.forEach((s, i) => {
        if(s.d && !showDone) return;
        let r = el("li", "sub" + (s.d ? " done" : ""));
        const c = el("button", "check"); c.type = "button"; c.disabled = !canWrite; c.setAttribute("aria-label", (s.d ? "Mark not done: " : "Mark done: ") + (s.t || ""));
        c.onclick = e => {
          e.stopPropagation();
          const prev = subs; const next = subs.map((x, j) => j === i ? Object.assign({}, x, {d: !x.d, seen: true}) : x);
          if(isNew(it)){ it.seenAt = Date.now(); saveSeen(it.id, it.seenAt); }
          const commit = () => { it.subtasks = next; render(); write(it.id, {subtasks: next}); if(!s.d) toast("To-do done", {id: it.id, prev: {subtasks: prev}}); };
          if(!s.d && !showDone){ r.classList.add("done", "leaving"); setTimeout(commit, 450); } else commit();
        };
        const sn = (s.notes || []).filter(x => x && x.t);
        const txt = el("span", "sub-t", s.t || "");
        r.append(c, txt);
        if(subIsNew(it, s)){ const dot = el("i", "sub-new"); dot.title = "New"; dot.setAttribute("aria-label", "New"); r.append(dot); }
        if(sn.length){
          const key = it.id + ":s" + i;
          const tg = el("button", "sub-tg"); tg.type = "button"; tg.innerHTML = CHEV;
          const panel = el("div", "sub-notes"); panel.hidden = !expanded.has(key);
          const ulN = el("ul", "bullets"); sn.forEach(x => ulN.append(el("li", null, x.t))); panel.append(ulN);
          const wrap = el("li", "sub-wrap"); const row = el("div", r.className); row.append(...r.childNodes); r = row;
          const sync = () => { const o = !panel.hidden; row.classList.toggle("open", o); tg.setAttribute("aria-expanded", String(o)); tg.setAttribute("aria-label", (o ? "Hide notes for " : "Show notes for ") + (s.t || "")); };
          const toggle = e => { e.stopPropagation(); panel.hidden = !panel.hidden; if(panel.hidden) expanded.delete(key); else expanded.add(key); sync(); markSeen(it, i); };
          tg.onclick = toggle; txt.classList.add("has-notes"); txt.onclick = toggle;
          row.append(tg); row.classList.add("with-notes");
          sync(); wrap.append(row, panel); ul.append(wrap);
          return;
        }
        ul.append(r);
      });
      if(ul.childNodes.length) box.append(ul);
      if(doneN){
        const tgl = el("button", "done-toggle", showDone ? "Hide completed" : (doneN === subs.length ? "All to-dos done · show " + doneN : "Show " + doneN + " completed"));
        tgl.type = "button"; tgl.onclick = e => { e.stopPropagation(); const k = it.id + ":done"; if(expanded.has(k)) expanded.delete(k); else expanded.add(k); render(); };
        box.append(tgl);
      }
      li.append(box);
    }
    const folds = el("div", "folds");
    const fold = (key, label, bodyNode) => {
      const box = el("div", "ctx"), h = el("button", "ctx-h"); h.type = "button";
      h.append(document.createTextNode(label)); h.insertAdjacentHTML("beforeend", CHEV);
      const body = el("div", "ctx-body"); body.hidden = !expanded.has(key); body.append(bodyNode);
      const sync = () => { box.classList.toggle("open", !body.hidden); h.setAttribute("aria-expanded", String(!body.hidden)); };
      h.onclick = e => { e.stopPropagation(); markSeen(it); body.hidden = !body.hidden; if(body.hidden) expanded.delete(key); else expanded.add(key); sync(); };
      sync(); box.append(h, body); folds.append(box);
    };
    const qs = (it.questions || []).filter(x => x && x.t);
    if(qs.length){
      const openN = qs.filter(q => !q.d).length, ulQ = el("ul", "subs");
      qs.forEach(q => {
        const r = el("li", "sub" + (q.d ? " done" : ""));
        const c = el("button", "check"); c.type = "button"; c.disabled = !canWrite; c.setAttribute("aria-label", (q.d ? "Mark open: " : "Mark answered: ") + q.t);
        c.onclick = e => { e.stopPropagation(); const next = it.questions.map(x => x === q ? Object.assign({}, x, {d: !x.d}) : x); it.questions = next; render(); write(it.id, {questions: next}); };
        r.append(c, el("span", "sub-t", q.t)); ulQ.append(r);
      });
      fold(it.id + ":qs", openN ? "Questions · " + openN + " open" : "Questions · all answered", ulQ);
    }
    const log = (it.log || []).filter(x => x && x.t);
    if(log.length){ const ulC = el("ul", "bullets"); log.forEach(x => ulC.append(el("li", null, x.t))); fold(it.id + ":log", "Context", ulC); }
    if(folds.childNodes.length) li.append(folds);
    const ho = handoffEl(it, section); if(ho) li.append(ho);
    return li;
  }

  /* ---------- new markers ---------- */
  const DAY20 = 20 * 3600 * 1000;
  function isNew(it){ const t = Number(it.newAt) || 0; return t > 0 && t > (Number(it.seenAt) || 0) && Date.now() - t < DAY20; }
  function subIsNew(it, s){ const n = Number(s.n) || 0; return !s.d && !s.seen && n > 0 && n > (Number(it.seenAt) || 0) && Date.now() - n < DAY20; }
  function hasNew(it){ return isNew(it) || (it.subtasks || []).some(s => subIsNew(it, s)); }
  function markSeen(it, subIdx){
    let changed = false;
    if(isNew(it)){ it.seenAt = Date.now(); saveSeen(it.id, it.seenAt); changed = true; }
    if(subIdx != null && it.subtasks && it.subtasks[subIdx] && subIsNew(it, it.subtasks[subIdx])){ it.subtasks[subIdx].seen = true; saveSeen(it.subtasks[subIdx].id, Date.now()); changed = true; }
    if(changed) render();
  }
  function newTag(){ const b = el("span", "new-tag", "New"); b.title = "Added in the last day"; return b; }
  function renderClearNew(){
    const b = $("clearNew"); const n = items.filter(it => !["done", "removed"].includes(it.section) && hasNew(it)).length;
    b.hidden = !n || !canWrite; b.textContent = "Clear new (" + n + ")";
  }
  $("clearNew").onclick = () => {
    const now = Date.now();
    items.filter(it => !["done", "removed"].includes(it.section) && hasNew(it)).forEach(it => { it.seenAt = now; saveSeen(it.id, now); (it.subtasks || []).forEach(x => { x.seen = true; saveSeen(x.id, now); }); });
    render();
  };

  /* ---------- views ---------- */
  let view = store("brief.view", "list") === "board" ? "board" : "list";
  function setView(v){
    view = v; save("brief.view", v);
    document.querySelector(".wrap").classList.toggle("board-view", v === "board");
    document.querySelectorAll(".view-toggle button[data-view]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
    if(v === "board") renderBoard();
  }
  document.querySelectorAll(".view-toggle button[data-view]").forEach(b => b.onclick = () => setView(b.dataset.view));
  let activeOnly = store("brief.activeOnly", "0") === "1";
  function setActiveOnly(on){
    activeOnly = on; save("brief.activeOnly", on ? "1" : "0");
    document.querySelector(".wrap").classList.toggle("active-only", on);
    $("activeOnly").setAttribute("aria-pressed", String(on)); renderBoard();
  }
  $("activeOnly").onclick = () => setActiveOnly(!activeOnly);
  const ACTIVE = () => ["today", "ready", "waiting"].concat(feat("handoff") ? ["handoff"] : []);
  let kDrag = null;
  function renderBoard(){
    const board = $("board"); if(!board || view !== "board") return;
    board.replaceChildren();
    const cols = ["upcoming", "today", "ready", "waiting"].concat(feat("handoff") ? ["handoff"] : [], ["later", "done"]);
    cols.filter(sec => !activeOnly || ACTIVE().includes(sec)).forEach(sec => {
      const col = el("section", "kcol"), h = el("h2"), dot = el("i");
      if(SEC_COLOR[sec] === "ring") dot.className = "ring"; else dot.style.background = SEC_COLOR[sec];
      const list = sec === "done" ? doneList() : sorted(sec);
      h.append(dot, document.createTextNode((sec === "done" ? "Completed" : LABEL[sec]) + " "), Object.assign(el("span", "count"), {textContent: list.length || ""}));
      const ul = el("ul"); ul.dataset.section = sec;
      list.forEach(it => {
        const li = el("li", "kcard"); li.dataset.id = it.id; li.draggable = canWrite;
        const head = el("div", "ihead");
        if(canWrite && sec !== "done") head.append(mainCheck(it));
        head.append(el("span", "title", it.title || "Untitled"));
        if(isNew(it)) head.append(newTag());
        if(canWrite) head.append(moreMenu(it, menuOpts(it, sec, head)));
        li.append(head);
        const chips = chipRow(it, {compact: true, who: sec === "waiting"}); if(chips) li.append(chips);
        const hh = handoffEl(it, sec); if(hh) li.append(hh);
        li.addEventListener("click", e => { if(e.target.closest("a,button,input,select,.menu-wrap,.wait-input")) return; openDrawer(it.id); });
        li.addEventListener("dragstart", e => { kDrag = it.id; li.classList.add("dragging"); try { e.dataTransfer.setData("text/plain", it.id); } catch(_){} e.dataTransfer.effectAllowed = "move"; });
        li.addEventListener("dragend", () => { kDrag = null; li.classList.remove("dragging"); board.querySelectorAll("ul.over").forEach(u => u.classList.remove("over")); });
        ul.append(li);
      });
      ul.addEventListener("dragover", e => { if(!kDrag) return; e.preventDefault(); ul.classList.add("over"); });
      ul.addEventListener("dragleave", e => { if(!ul.contains(e.relatedTarget)) ul.classList.remove("over"); });
      ul.addEventListener("drop", e => {
        e.preventDefault(); ul.classList.remove("over");
        const it = items.find(i => i.id === kDrag); if(!it) return;
        const target = e.target.closest(".kcard");
        if(it.section !== sec){ change(it, {section: sec}); return; }
        if(sec === "done") return;
        const ids = sorted(sec).map(i => i.id); ids.splice(ids.indexOf(it.id), 1);
        let to = target ? ids.indexOf(target.dataset.id) : ids.length; if(to < 0) to = ids.length;
        if(target && target.dataset.id !== it.id){ const r = target.getBoundingClientRect(); if(e.clientY > r.top + r.height / 2) to += 1; }
        ids.splice(to, 0, it.id); reorder(sec, ids);
      });
      col.append(h, ul); board.append(col);
    });
  }
  const doneList = () => items.filter(i => i.section === "done").sort((a, b) => (Number(b.touchedAt) || 0) - (Number(a.touchedAt) || 0));

  let drawerId = null;
  function openDrawer(id){ drawerId = id; renderDrawer(); $("drawerBack").hidden = false; const d = $("drawer"); d.setAttribute("aria-hidden", "false"); requestAnimationFrame(() => { d.classList.add("open"); $("drawerClose").focus(); }); }
  function closeDrawer(){ drawerId = null; const d = $("drawer"); d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); $("drawerBack").hidden = true; }
  function renderDrawer(){
    if(!drawerId) return;
    const it = items.find(i => i.id === drawerId); if(!it){ closeDrawer(); return; }
    $("drawerSec").textContent = LABEL[it.section] || it.section;
    const li = renderItem(it, it.section); li.classList.remove("collapsed");
    $("drawerBody").replaceChildren(li); requestAnimationFrame(fixClamps);
  }
  $("drawerClose").onclick = closeDrawer; $("drawerBack").onclick = closeDrawer;
  document.addEventListener("keydown", e => { if(e.key === "Escape" && drawerId && !document.querySelector(".menu:not([hidden])")) closeDrawer(); });
  $("drawerBody").addEventListener("click", e => { if(!e.target.closest("a,button,input,textarea,select,summary,.ctx,.menu,.subs")) e.stopPropagation(); }, true);

  function renderCompleted(){
    const ul = $("list-complete"); if(!ul) return; ul.replaceChildren();
    const list = doneList(); $("c-complete").textContent = list.length || "";
    if(!list.length){ ul.append(el("li", "empty", "Nothing completed in the last week.")); return; }
    list.forEach(it => {
      const li = el("li", "mini"), t = el("span", "mt", it.title || "Untitled"); t.style.flex = "1"; t.style.minWidth = "0"; li.append(t);
      if(canWrite){ const b = el("button", "reopen", "Reopen"); b.type = "button"; b.onclick = e => { e.stopPropagation(); change(it, {section: "today"}); }; li.append(b); }
      ul.append(li);
    });
  }
  function renderSectionSums(){
    document.querySelectorAll("#main > section.foldable").forEach(card => {
      const key = card.dataset.key, sec = key === "completed" ? "done" : key;
      const list = sec === "done" ? doneList() : sorted(sec), h = card.querySelector("h2");
      let s = h.querySelector(".sec-sum"); if(!s){ s = el("span", "sec-sum"); const c = h.querySelector(".count"); if(c) c.after(s); else h.append(s); }
      const open = sec === "done" ? 0 : list.reduce((n, i) => n + (i.subtasks || []).filter(x => x && !x.d).length, 0);
      s.textContent = !list.length ? "Empty" : list.length + " item" + (list.length === 1 ? "" : "s") + (open ? " · " + open + " open to-do" + (open === 1 ? "" : "s") : "");
    });
  }
  function listedIds(){ return items.filter(i => SECTIONS.includes(i.section)).map(i => i.id); }
  function updateCollapseAll(){ const b = $("collapseAll"), ids = listedIds(); const all = ids.length > 0 && ids.every(id => collapsedIds.has(id)); b.textContent = all ? "Expand all" : "Collapse all"; b.setAttribute("aria-pressed", String(all)); }
  $("collapseAll").onclick = () => { const ids = listedIds(); const all = ids.length > 0 && ids.every(id => collapsedIds.has(id)); ids.forEach(id => all ? collapsedIds.delete(id) : collapsedIds.add(id)); saveCollapsed(); render(); };
  function priorityOf(note){ const m = /^\s*(urgent|high|medium|low)\s+priority\b[\s.:,;—-]*/i.exec(String(note || "")); return m ? {p: m[1].toLowerCase(), rest: String(note).slice(m[0].length).trim()} : null; }
  function prioTag(p){
    const label = p.charAt(0).toUpperCase() + p.slice(1), s = el("span", "prio prio-" + p); s.title = label + " priority";
    const lit = {low: 1, medium: 2, high: 3}[p] || 0;
    s.innerHTML = p === "urgent"
      ? '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="14" height="14" rx="3.5" fill="currentColor"/><path d="M8 4.5v4.2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="11.3" r="1.05" fill="#fff"/></svg>'
      : '<svg viewBox="0 0 16 16" aria-hidden="true">' + [[1.5, 9, 5], [6.5, 6, 8], [11.5, 3, 11]].map(([x, y, h], i) => '<rect x="' + x + '" y="' + y + '" width="3" height="' + h + '" rx="1" fill="currentColor" opacity="' + (i < lit ? 1 : .28) + '"/>').join("") + '</svg>';
    s.append(document.createTextNode(label)); return s;
  }
  function noteEl(tag, cls, text, id){ const n = el(tag, cls + " clamp", text); n.dataset.nid = id; if(expanded.has(id)) n.classList.add("open"); return n; }
  function fixClamps(){
    document.querySelectorAll(".clamp").forEach(n => {
      const next = n.nextElementSibling; if(next && next.classList.contains("read-more")) return;
      const open = n.classList.contains("open"); if(!open && n.scrollHeight <= n.clientHeight + 1) return;
      const b = el("button", "read-more", open ? "Show less" : "Show more"); b.type = "button";
      b.onclick = e => { e.stopPropagation(); const id = n.dataset.nid; const o = n.classList.toggle("open"); if(o) expanded.add(id); else expanded.delete(id); b.textContent = o ? "Show less" : "Show more"; };
      n.after(b);
    });
  }
  window.addEventListener("resize", () => { document.querySelectorAll(".read-more").forEach(b => b.remove()); fixClamps(); });
  function closeMenus(){ document.querySelectorAll(".menu").forEach(m => m.hidden = true); document.querySelectorAll(".more[aria-expanded='true']").forEach(b => b.setAttribute("aria-expanded", "false")); }
  function moreMenu(it, opts){
    const wrap = el("div", "menu-wrap"), btn = el("button", "more", "⋯"); btn.type = "button"; btn.setAttribute("aria-label", "More actions"); btn.setAttribute("aria-haspopup", "menu"); btn.setAttribute("aria-expanded", "false");
    const menu = el("div", "menu"); menu.setAttribute("role", "menu"); menu.hidden = true;
    opts.forEach(([label, target, cls]) => { const o = el("button", cls || null, label); o.type = "button"; o.setAttribute("role", "menuitem"); o.onclick = e => { e.stopPropagation(); closeMenus(); if(typeof target === "function") return target(); change(it, typeof target === "string" ? {section: target} : Object.assign({}, target)); }; menu.append(o); });
    btn.onclick = e => { e.stopPropagation(); const open = menu.hidden; closeMenus(); menu.hidden = !open; btn.setAttribute("aria-expanded", String(open)); if(open) menu.querySelector("button").focus(); };
    wrap.append(btn, menu); return wrap;
  }
  document.addEventListener("click", closeMenus);
  document.addEventListener("keydown", e => { if(e.key === "Escape") closeMenus(); });

  function render(){
    SECTIONS.forEach(s => {
      const ul = $("list-" + s); if(!ul) return; ul.replaceChildren();
      const list = sorted(s); if(!list.length) ul.append(el("li", "empty", EMPTY[s]));
      list.forEach(it => ul.append(renderItem(it, s)));
      const c = $("c-" + s); if(c) c.textContent = list.length || "";
    });
    renderCompleted(); renderBoard(); renderSectionSums(); updateCollapseAll(); renderDrawer(); renderMeetings(); renderClearNew();
    requestAnimationFrame(fixClamps);
  }

  /* ---------- side rail ---------- */
  function renderAsk(a){
    const li = el("li", "ask");
    const c = el("button", "check"); c.type = "button"; c.setAttribute("aria-label", "Mark done: " + (a.title || "")); c.disabled = !canWrite; c.onclick = () => change(a, {section: "done"});
    const tx = el("span", "t", a.title || "Untitled"); if(isNew(a)) tx.append(newTag()); if(a.note) tx.append(noteEl("span", "n", a.note, a.id));
    li.append(c, tx);
    if(canWrite){ const acts = el("div", "actions"); acts.append(moreMenu(a, [["Move to " + LABEL.today, {section: "today"}], ["Delete", "removed", "danger"]])); li.append(acts); }
    return li;
  }
  function openQuestions(){ const out = []; items.filter(i => SECTIONS.includes(i.section)).forEach(it => (it.questions || []).forEach(q => { if(q && q.t && !q.d) out.push([it, q]); })); return out; }
  function renderQuestion(it, q){
    const li = el("li", "ask"), c = el("button", "check"); c.type = "button"; c.disabled = !canWrite; c.setAttribute("aria-label", "Mark answered: " + q.t);
    c.onclick = () => { const prev = it.questions; const next = prev.map(x => x === q ? Object.assign({}, x, {d: true}) : x); it.questions = next; render(); write(it.id, {questions: next}); toast("Question answered", {id: it.id, prev: {questions: prev}}); };
    const tx = el("span", "t", q.t); tx.append(el("span", "n", it.title || "")); li.append(c, tx); return li;
  }
  function renderMeetings(){
    const ul = $("meetings"); if(!ul) return; ul.replaceChildren();
    if(!dayData){ ul.append(el("li", "empty", "Loading today's calendar…")); return; }
    if(dayData.off){ ul.append(el("li", "empty", "No calendar for this workspace.")); }
    else if(dayData.error){ ul.append(el("li", "empty", "Couldn't load your calendar.")); }
    const m = meetingsList();
    if(!dayData.off && !dayData.error && !m.length) ul.append(el("li", "empty", "Nothing on your calendar today."));
    const asks = items.filter(i => i.section === "meeting");
    const used = new Set();
    const follow = feat("showFollowUp") ? sorted("ready").concat(sorted("waiting")) : [];
    m.forEach((x, idx) => {
      const li = el("li", "mtg-block"), head = el("div", "mtg"); head.append(el("span", "time", x.time || ""));
      const url = safeUrl(x.url), t = el(url ? "a" : "span", "t", x.title || "Meeting"); if(url){ t.href = url; t.target = "_blank"; t.rel = "noopener"; }
      head.append(t); li.append(head);
      const mine = feat("meetingAsks") ? asks.filter(a => !used.has(a.id) && meetingMatches(a.meeting, x)) : [];
      mine.forEach(a => used.add(a.id));
      const qs = feat("meetingAsks") && idx === 0 ? openQuestions() : [];
      if(mine.length || qs.length){ li.append(el("div", "agenda-h", "To ask")); const l = el("ul", "agenda"); mine.forEach(a => l.append(renderAsk(a))); qs.forEach(([it, q]) => l.append(renderQuestion(it, q))); li.append(l); }
      if(follow.length && (mine.length || qs.length || feat("followUpAll"))){
        li.append(el("div", "agenda-h", "Show & follow up")); const l = el("ul", "agenda");
        follow.forEach(d => { const r = el("li", "mini"), dot = el("i"); dot.style.background = d.section === "ready" ? "var(--s-ready)" : "var(--s-wait)"; const mt = el("span", "mt", d.title || "Untitled"); if(d.section === "waiting" && d.waitingOn) mt.append(el("span", "sub2", "waiting on " + d.waitingOn)); r.append(dot, mt); l.append(r); });
        li.append(l);
      }
      ul.append(li);
    });
    const rest = asks.filter(a => !used.has(a.id));
    if(rest.length){ const li = el("li", "mtg-block"); li.append(el("div", "agenda-h", "To ask, later meetings")); const l = el("ul", "agenda"); rest.forEach(a => { const r = renderAsk(a); if(a.meeting) r.querySelector(".t").append(el("span", "n", a.meeting)); l.append(r); }); li.append(l); ul.append(li); }
  }

  /* ---------- actions ---------- */
  function toast(msg, undo){
    undoState = undo || null; $("toastMsg").textContent = msg; $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $("toast").hidden = true; undoState = null; }, 6000);
  }
  $("toastUndo").onclick = async () => { const u = undoState; $("toast").hidden = true; undoState = null; if(!u) return; const it = items.find(i => i.id === u.id); if(it){ Object.assign(it, u.prev); render(); } await write(u.id, u.prev); };
  function askWaiting(it, anchor){
    const old = anchor.parentNode.querySelector(".wait-input"); if(old){ old.focus(); return; }
    const inp = el("input", "sub-input wait-input"); inp.type = "text"; inp.placeholder = "Waiting on who? Press Enter"; inp.setAttribute("aria-label", "Waiting on who"); inp.value = it.waitingOn || "";
    inp.style.marginLeft = "0"; inp.style.width = "100%"; inp.style.maxWidth = "320px"; inp.onclick = e => e.stopPropagation();
    inp.onkeydown = async e => {
      if(e.key === "Escape"){ inp.remove(); return; } if(e.key !== "Enter") return;
      const who = inp.value.trim().slice(0, 80); if(!who) return;
      const prev = {section: it.section, order: it.order ?? null, waitingOn: it.waitingOn || null};
      const patch = {waitingOn: who}; if(it.section !== "waiting"){ patch.section = "waiting"; patch.order = nextOrder("waiting"); }
      Object.assign(it, patch); render(); toast("Waiting on " + who, {id: it.id, prev}); await write(it.id, patch);
    };
    inp.onblur = () => setTimeout(() => inp.remove(), 150);
    anchor.after(inp); inp.focus();
  }
  function nextOrder(section){ const l = sorted(section); return l.length ? (l[l.length - 1].order ?? l.length) + 1 : 1; }
  async function change(it, patch){
    const prev = {section: it.section, order: it.order ?? null, meeting: it.meeting || null};
    if(patch.section && patch.section !== it.section) patch.order = nextOrder(patch.section);
    Object.assign(it, patch); if(patch.section === "done") it.touchedAt = Date.now(); render();
    const s = patch.section || it.section;
    toast(s === "done" ? "Marked complete" : s === "removed" ? "Deleted from Todoist" : s === "meeting" ? "Added to " + (patch.meeting || "the meeting") : "Moved to " + LABEL[s], s === "removed" ? null : {id: it.id, prev});
    await write(it.id, patch);
  }
  async function reorder(section, ids){
    const writes = []; ids.forEach((id, i) => { const it = items.find(x => x.id === id); if(it && it.order !== i + 1){ it.order = i + 1; writes.push([id, i + 1]); } });
    render(); for(const [id, order] of writes) await write(id, {order});
  }
  let dragId = null;
  function wireListDrag(ul){
    ul.addEventListener("mousedown", e => { if(e.target.closest("button,a")) return; const li = e.target.closest(".item"); if(li && li.draggable) li.classList.add("grabbing"); });
    ul.addEventListener("mouseup", () => ul.querySelectorAll(".grabbing").forEach(x => x.classList.remove("grabbing")));
    ul.addEventListener("dragstart", e => { const li = e.target.closest(".item"); if(!li) return; dragId = li.dataset.id; li.classList.add("dragging"); try { e.dataTransfer.setData("text/plain", dragId); } catch(_){} e.dataTransfer.effectAllowed = "move"; });
    ul.addEventListener("dragend", e => { const li = e.target.closest(".item"); if(li) li.classList.remove("dragging", "grabbing"); ul.querySelectorAll(".over").forEach(x => x.classList.remove("over")); dragId = null; });
    ul.addEventListener("dragover", e => { if(!dragId) return; const li = e.target.closest(".item"); e.preventDefault(); ul.querySelectorAll(".over").forEach(x => x.classList.remove("over")); if(li && li.dataset.id !== dragId) li.classList.add("over"); });
    ul.addEventListener("drop", e => {
      e.preventDefault(); const target = e.target.closest(".item"), section = ul.dataset.section; if(!dragId || !target) return;
      const ids = sorted(section).map(i => i.id); if(!ids.includes(dragId)) return;
      const from = ids.indexOf(dragId); ids.splice(from, 1); let to = ids.indexOf(target.dataset.id); if(to < 0) return; if(from <= to) to += 1;
      ids.splice(to, 0, dragId); reorder(section, ids);
    });
  }

  /* ---------- chat linking (desktop app only, per workspace) ---------- */
  async function linkChats(){
    if(!feat("chatLink")) return 0;
    const text = r => { const p = r && r.payload; if(typeof p === "string") return p; return ((r && r.content) || []).filter(c => c.type === "text").map(c => c.text).join("\n"); };
    const tried = store("dash.chatTried", {});
    const nameOf = it => String(it.title || "").trim();
    const candidates = items.filter(it => nameOf(it).length >= 3 && !it.chat && ["today", "ready", "waiting", "handoff"].includes(it.section) && !(Date.now() - (tried[it.id] || 0) < 3 * 24 * 3600 * 1000));
    const want = [...new Set(candidates.map(it => nameOf(it).toUpperCase()))];
    if(!want.length) return 0;
    const opened = text(await mcp.callTool("host:claude_browser", "preview_start", {url: "https://claude.ai/recents"}));
    const m = opened.match(/tabId\W+([A-Za-z0-9_-]+)/); const tabId = m ? m[1] : undefined;
    const find = async q => text(await mcp.callTool("host:claude_browser", "find", tabId ? {query: q, tabId} : {query: q}, {cache: false}));
    await new Promise(r => setTimeout(r, 2500));
    const found = new Map(); let first = true;
    for(const key of want){
      let out = await find(key);
      if(first && !/href="\/chat\//.test(out) && !/Found [1-9]/.test(out)){ await new Promise(r => setTimeout(r, 2500)); out = await find(key); }
      first = false;
      const esc = key.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&").replace(/"/g, '\\\\?"');
      const mm = out.match(new RegExp('link "[^"]*' + esc + '[^"]*" \\[ref_\\d+\\] href="(\\/chat\\/[0-9a-f-]+)"', "i"));
      if(mm) found.set(key, "https://claude.ai" + mm[1]);
    }
    let n = 0;
    for(const it of candidates){
      const url = found.get(nameOf(it).toUpperCase());
      if(!url){ tried[it.id] = Date.now(); continue; }
      it.chat = url; await write(it.id, {chat: url}); n++;
    }
    save("dash.chatTried", tried);
    return n;
  }

  /* ---------- update button + status ---------- */
  let statusDoc = null, statusUnsub = null;
  function watchStatus(){
    if(statusUnsub){ try { statusUnsub(); } catch(_){} statusUnsub = null; }
    if(!db) return;
    const w = WS;
    try {
      statusUnsub = db.doc("meta/status-" + w.id).onSnapshot(sn => {
        if(w !== WS) return; const prev = statusDoc; statusDoc = sn.exists ? sn.data() : null; renderStatus();
        if(prev && prev.state === "running" && statusDoc && statusDoc.state !== "running") loadTasks();
      }, () => {});
    } catch(_){}
  }
  function renderStatus(){
    const btn = $("updateBtn"), lbl = $("updateLabel"), st = $("updateState"), s = statusDoc || {};
    btn.hidden = !mcp || !/^trig_[A-Za-z0-9]+$/.test(WS.updateTask || "");
    const running = s.state === "running" && Date.now() - (Number(s.startedAt) || 0) < 20 * 60 * 1000;
    btn.classList.toggle("busy", running);
    if(!btn.dataset.local){ btn.disabled = running; lbl.textContent = running ? "Updating…" : "Update"; }
    const t = ms => new Date(ms).toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"});
    const day = ms => { const d = new Date(ms), n = new Date(); return d.toDateString() === n.toDateString() ? t(ms) : d.toLocaleDateString("en-US", {weekday: "short"}) + " " + t(ms); };
    st.textContent = running ? "Updating…" : s.state === "done" && s.finishedAt ? "Updated " + day(Number(s.finishedAt)) : s.state === "error" && s.finishedAt ? "Last update had a problem" : "";
    $("updateTip").textContent = s.summary || "";
  }
  $("updateState").addEventListener("click", e => { e.stopPropagation(); $("updateTip").classList.toggle("show"); });
  document.addEventListener("click", () => $("updateTip").classList.remove("show"));
  async function runUpdate(){
    const btn = $("updateBtn"), lbl = $("updateLabel"), w = WS;
    btn.dataset.local = "1"; btn.disabled = true; btn.classList.add("busy");
    let linked = 0;
    try { if(feat("chatLink")){ lbl.textContent = "Linking chats…"; linked = await linkChats(); } } catch(_){}
    try {
      lbl.textContent = "Starting…";
      await mcp.callTool(CFG.remoteServer || "Claude Code Remote", "fire_trigger", {trigger_id: w.updateTask}, {cache: false});
      if(w === WS) statusDoc = {state: "running", startedAt: Date.now()};
      toast((linked ? "Linked " + linked + " chat" + (linked === 1 ? "" : "s") + ". " : "") + "Updating. New items show up here in a few minutes.");
    } catch(e){
      const c = e && e.code;
      toast(c === "server_not_connected" || c === "needs_reauth" ? "Reconnect Claude Code Remote in Settings → Connectors." :
        c === "not_in_manifest" || c === "approval_required" || c === "cancelled" ? "Starting the update needs your OK." : "The update couldn't start. Try again in a minute.");
    } finally { delete btn.dataset.local; renderStatus(); }
  }
  $("updateBtn").onclick = runUpdate;

  function greeting(){ const h = new Date().getHours(); return (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + (OWNER_NAME ? ", " + OWNER_NAME : ""); }
  $("refreshed").textContent = greeting();
  $("date").textContent = new Date().toLocaleDateString("en-US", {weekday: "long", month: "long", day: "numeric"});
  $("ver").textContent = "v" + VERSION;

  /* ---------- start ---------- */
  WS = pickInitial();
  setView(view); setActiveOnly(activeOnly);
  applyWorkspace(WS); // paint the last known tasks right away, before the connectors are ready
  (async () => {
    const use = n => (window.claude && window.claude.use) ? window.claude.use(n).catch(() => null) : Promise.resolve(null);
    [db, mcp] = await Promise.all([use("db"), use("mcp")]);
    if(!mcp){ canWrite = false; render(); $("refreshed").textContent = "Open this page in Claude to see your dashboard."; return; }
    applyWorkspace(WS);
    setInterval(loadTasks, 120000);
    let calDay = new Date().toDateString();
    setInterval(() => { if(new Date().toDateString() !== calDay){ calDay = new Date().toDateString(); loadCalendar(); $("date").textContent = new Date().toLocaleDateString("en-US", {weekday: "long", month: "long", day: "numeric"}); } $("refreshed").textContent = greeting(); renderStatus(); }, 60000);
    document.addEventListener("visibilitychange", () => { if(!document.hidden && Date.now() - lastLoad > 30000) loadTasks(); });
  })();
})();
