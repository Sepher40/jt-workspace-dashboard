// Builds dist/dashboard.js from src/ (styles + markup are inlined into the script).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const css = readFileSync("src/style.css", "utf8");
const markup = readFileSync("src/markup.html", "utf8");
let js = readFileSync("src/app.js", "utf8");
js = js.replace("__CSS__", () => JSON.stringify(css)).replace("__MARKUP__", () => JSON.stringify(markup)).replace("__VERSION__", pkg.version);
mkdirSync("dist", { recursive: true });
writeFileSync("dist/dashboard.js", js);
console.log("built dist/dashboard.js", (js.length / 1024).toFixed(1) + " KB", "v" + pkg.version);
