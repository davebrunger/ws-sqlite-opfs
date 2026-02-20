# @whitstable-software/sqlite-opfs

`@whitstable-software/sqlite-opfs` is a small React-first helper package for running SQLite in the browser using OPFS and wiring it into Drizzle.

It provides:
- A `useClient()` hook that manages opening/closing an OPFS-backed SQLite DB
- Optional startup migrations
- Backup/download and restore helpers
- Exported TypeScript types for clients and migrations

## Installation

```bash
pnpm add @whitstable-software/sqlite-opfs
```

Peer dependencies (install in your app):

```bash
pnpm add @sqlite.org/sqlite-wasm drizzle-orm react
```

Import surface:

```ts
import {
	useClient,
	backupDatabase,
	restoreDatabase,
	type ClientOptions,
	type DbHandle,
	type DbClient,
	type Migration,
	type MigrationsProvider,
} from "@whitstable-software/sqlite-opfs";
```

## Requirements

- Browser environment (uses `Worker`, `window`, `document`, `navigator.storage`)
- OPFS-capable browser
- React app (the DB client is provided as a React hook)

## Quick start

```ts
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { useClient } from "@whitstable-software/sqlite-opfs";

export function useAppDb() {
	const client = useClient({ databaseName: "app-db" });
	const db = drizzle(client.exec);
	return { db, client };
}
```

## Drizzle integration example

This package is designed to pair well with Drizzle's SQLite proxy style.

```ts
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { useClient } from "@whitstable-software/sqlite-opfs";

export function useDrizzleDb() {
	const databaseName = "app-db";

	const client = useClient({ databaseName, migrations: loadMigrations });
	const db = drizzle(client.exec);

	return { db, client };
}
```

## Migrations

`useClient()` accepts a `migrations` option with one of these forms:

- `Migration[]`
- `() => Migration[]`
- `() => Promise<Migration[]>`

Migration shape:

```ts
type Migration = {
	readonly name: string;
	readonly sql: string;
};
```

Vite loader example for `.sql` files:

```ts
function loadMigrations() {
	const modules = import.meta.glob("/drizzle/*.sql", {
		query: "raw",
		import: "default",
		eager: true,
	});

	const entries = Object.entries(modules)
		.sort(([a], [b]) => a.localeCompare(b));

	return entries.map(([name, sql]) => ({
		name,
		sql: sql as string,
	}));
}
```

On open, the package:
1. Ensures `__drizzle_migrations` exists
2. Checks already-applied migration names
3. Runs missing migrations in transactions

## Backup and restore

```ts
import { backupDatabase, restoreDatabase } from "@whitstable-software/sqlite-opfs";

// Downloads a dated .sqlite3 backup file to the user
await backupDatabase(client);

// Restores an uploaded file into a target DB name, then reloads the page
await restoreDatabase(client, "app-db", fileInput.files![0]);
```

## API reference

### `useClient(options)`

```ts
type ClientOptions = {
	readonly databaseName: string;
	readonly migrations?: MigrationsProvider;
};
```

Returns:

```ts
type DbClient = {
	readonly openDb: () => Promise<DbHandle>;
	readonly exec: (sql: string, params: any[], method: "run" | "all" | "values" | "get") => Promise<{ rows: any[] }>;
	readonly close: () => Promise<void>;
	readonly vacuumInto: (targetDatabaseName: string) => Promise<void>;
	readonly switchDb: (newConfig: ClientOptions) => Promise<void>;
};
```

### Root exports

- `useClient(options)`
- `backupDatabase(client)`
- `restoreDatabase(client, targetDatabaseName, file)`
- `ClientOptions` (type)
- `DbHandle` (type)
- `DbClient` (type)
- `Migration` (type)
- `MigrationsProvider` (type)

Type symbols are exported as type-only exports, so import them with `import type`.

## Notes

- Databases are stored as `<databaseName>.sqlite3` in OPFS.
- Backup files are named `<databaseName>.backup.YYYY-MM-DD.sqlite3`.
- `restoreDatabase()` triggers `window.location.reload()` after writing the file.

## Development

```bash
pnpm install
pnpm build
pnpm dev
```

## License

MIT
