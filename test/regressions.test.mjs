import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("package exports require points to dist/index.cjs", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.exports["."].require, "./dist/index.cjs");
});

test("client exposes vacuumInto and deprecated vaccuumInto alias", () => {
  const src = read("src/client.ts");
  assert.match(src, /readonly vacuumInto:\s*\(targetDatabaseName: string\) => Promise<void>/);
  assert.match(src, /readonly vaccuumInto:\s*\(targetDatabaseName: string\) => Promise<void>/);
  assert.match(src, /const vaccuumInto = vacuumInto;/);
});

test("client awaits resolveMigrations before applyMigrations", () => {
  const src = read("src/client.ts");
  assert.match(src, /const migrationsToRun = await resolveMigrations\(migrations\);/);
  assert.match(src, /await applyMigrations\(promiser, dbId, migrationsToRun\)\s*;?/);
});

test("backupDatabase uses vacuumInto", () => {
  const src = read("src/backupAndRestore.ts");
  assert.match(src, /await client\.vacuumInto\(databaseName\);/);
});

test("migrations does not import missing Sqlite3Worker1Promiser export", () => {
  const src = read("src/migrations.ts");
  assert.doesNotMatch(src, /import type \{ Sqlite3Worker1Promiser \} from "@sqlite\.org\/sqlite-wasm";/);
});
