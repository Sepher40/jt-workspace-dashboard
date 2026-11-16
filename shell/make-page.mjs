// node shell/make-page.mjs accounts/<file>.json <latest|stable|inline> <out.html>
// Makes an account's dashboard page: its settings plus the shared code (loaded from npm, or inlined).
import { readFileSync, writeFileSync } from "node:fs";
const [cfgPath, channel = "latest", out = "page.html"] = process.argv.slice(2);
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
let html = readFileSync(new URL("./index.template.html", import.meta.url), "utf8")
  .replace("__TITLE__", cfg.title || "Dashboard")
  .replace("__CONFIG__", () => JSON.stringify(cfg, null, 2).replace(/</g, "\\u003c"));
if(channel === "inline"){
  const code = readFileSync(new URL("../dist/dashboard.js", import.meta.url), "utf8").replace(/<\/script/gi, "<\\/script");
  html = html.replace(/<script>\n\(function\(\)\{\n  var tag[\s\S]*?<\/script>/, () => "<script>\n" + code + "\n</script>");
} else html = html.replace("__CHANNEL__", channel);
writeFileSync(out, html);
console.log("wrote", out, channel);
