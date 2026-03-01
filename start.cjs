process.chdir(__dirname);
require("child_process").execFileSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", ...process.argv.slice(2)],
  { stdio: "inherit" }
);
