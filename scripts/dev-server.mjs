import { spawn } from "node:child_process";
const input = process.argv.slice(2);
const args = [];
for (let i = 0; i < input.length; i++) {
  if (input[i] === "--strictPort") continue;
  args.push(input[i] === "--host" ? "--hostname" : input[i]);
}
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    ...(input.includes("--strictPort") ? ["start"] : ["dev"]),
    ...args,
  ],
  { stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
