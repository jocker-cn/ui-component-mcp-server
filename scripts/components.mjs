import { execFileSync } from "node:child_process";
import { access, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, createServer } from "vite";

const [command, selected] = process.argv.slice(2);
const project = fileURLToPath(new URL("../", import.meta.url));
const source = join(project, "apps");
const dist = join(project, "dist");
const ids = (await readdir(source, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
  .map((entry) => entry.name)
  .sort();

function config(id) {
  const directory = join(source, id);
  return {
    root: join(project, "ui"),
    configFile: join(project, "vite.config.ts"),
    define: { __COMPONENT_ID__: JSON.stringify(id) },
    resolve: {
      alias: {
        "@component/app": join(directory, "app.ts"),
        "@component/view": join(directory, "View.tsx"),
      },
    },
  };
}

for (const id of ids) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error(`Invalid app directory "${id}". Use lowercase letters, digits and hyphens.`);
  }
}

if (command === "dev") {
  const id = selected ?? ids[0];
  if (!ids.includes(id)) throw new Error(`Unknown component "${id ?? ""}". Available components: ${ids.join(", ")}`);
  const server = await createServer(config(id));
  await server.listen();
  server.printUrls();
} else if (command === "build") {
  const manifest = join(dist, "apps.json");
  await rm(manifest, { force: true });
  const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
  execFileSync(process.execPath, [tsc, "-p", "tsconfig.server.json"], { cwd: project, stdio: "inherit" });

  for (const id of ids) {
    await Promise.all(["app.ts", "View.tsx"].map((file) => access(join(source, id, file))));
    const outDir = join(dist, "views", id);
    await build({ ...config(id), build: { outDir, emptyOutDir: true } });
    const files = await readdir(outDir);
    if (files.length !== 1 || files[0] !== "index.html") {
      throw new Error(`Component "${id}" must build to one HTML file. Import local assets so Vite can inline them.`);
    }
  }

  await writeFile(manifest, JSON.stringify(ids) + "\n");
}
