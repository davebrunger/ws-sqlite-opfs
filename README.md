# @whitstable-software/sqlite-opfs

`@ws/sqlite-opfs` is a small React-first helper package for running SQLite in the browser using OPFS and wiring it into Drizzle.

It provides:
- A `useClient()` hook that manages opening/closing an OPFS-backed SQLite DB
- Optional startup migrations
- Backup/download and restore helpers
- Database filename/URI helper utilities

## Installation

```bash
pnpm add @ws/sqlite-opfs
```

Peer dependencies (install in your app):

```bash
pnpm add @sqlite.org/sqlite-wasm drizzle-orm react
```

## Requirements

- Browser environment (uses `Worker`, `window`, `document`, `navigator.storage`)
- OPFS-capable browser
- React app (the DB client is provided as a React hook)

## Quick start

```ts
import { useClient } from "@ws/sqlite-opfs";

export function useAppDb() {
	const client = useClient({
		databaseName: "app-db",
		migrations: [
			{
				name: "001_create_users",
				sql: `
					CREATE TABLE IF NOT EXISTS users (
						id INTEGER PRIMARY KEY,
						name TEXT NOT NULL
					);
				`,
			},
		],
	});

	return client;
}
```

Run SQL directly:

```ts
const rows = await client.exec("SELECT id, name FROM users", [], "all");
console.log(rows.rows);
```

## Drizzle integration example

This package is designed to pair well with Drizzle's SQLite proxy style.

```ts
import { sqliteProxy } from "drizzle-orm/sqlite-proxy";
import { useClient } from "@ws/sqlite-opfs";

export function useDrizzleDb() {
	const client = useClient({ databaseName: "app-db" });

	const db = sqliteProxy(async (sql, params, method) => {
		const result = await client.exec(sql, params as any[], method as any);
		return { rows: result.rows };
	});

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

On open, the package:
1. Ensures `__drizzle_migrations` exists
2. Checks already-applied migration names
3. Runs missing migrations in transactions

## Backup and restore

```ts
import { backupDatabase, restoreDatabase } from "@ws/sqlite-opfs";

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
	readonly vaccuumInto: (targetDatabaseName: string) => Promise<void>;
	readonly switchDb: (newConfig: ClientOptions) => Promise<void>;
};
```

### Utility exports

- `backupDatabase(client)`
- `restoreDatabase(client, targetDatabaseName, file)`
- `buildDbUri(databaseName)`
- `buildDFilename(databaseName)`
- `buildBackupDbUri(databaseName, date?)`
- `buildBackupDbFilename(databaseName, date?)`
- `resolveMigrations(...)`
- `applyMigrations(...)`

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
