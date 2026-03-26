# @whitstable-software/sqlite-opfs

`@whitstable-software/sqlite-opfs` is a small React-first helper package for running SQLite in the browser using OPFS and wiring it into Drizzle.

It provides:
- A `useClient()` hook that manages opening/closing an OPFS-backed SQLite DB
- A `DbProvider` / `useDb()` context pattern for sharing a single DB connection across components
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
	DbProvider,
	useDb,
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

The recommended approach is to use `DbProvider` at the root of your app and `useDb()` in any component that needs database access. This ensures a single worker and connection is shared across your entire app.

```tsx
import { DbProvider } from "@whitstable-software/sqlite-opfs";

function App() {
	return (
		<DbProvider options={{ databaseName: "app-db" }}>
			<MyApp />
		</DbProvider>
	);
}
```

Then in any child component:

```ts
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { useDb } from "@whitstable-software/sqlite-opfs";

function MyComponent() {
	const client = useDb();
	const db = drizzle(client.exec);
	// ...
}
```

Alternatively, you can use `useClient()` directly for advanced scenarios (e.g. managing multiple databases):

```ts
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { useClient } from "@whitstable-software/sqlite-opfs";

export function useAppDb() {
	const client = useClient({ databaseName: "app-db" });
	const db = drizzle(client.exec);
	return { db, client };
}
```

> **Note:** Each call to `useClient()` creates its own worker and database connection. Calling it in multiple components will open multiple connections to the same database, which can cause lock contention. Use `DbProvider` / `useDb()` to share a single connection.

## Drizzle integration example

This package is designed to pair well with Drizzle's SQLite proxy style.

With the provider pattern:

```tsx
import { DbProvider } from "@whitstable-software/sqlite-opfs";

function App() {
	return (
		<DbProvider options={{ databaseName: "app-db", migrations: loadMigrations }}>
			<MyApp />
		</DbProvider>
	);
}
```

```ts
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { useDb } from "@whitstable-software/sqlite-opfs";

export function useDrizzleDb() {
	const client = useDb();
	const db = drizzle(client.exec);
	return { db, client };
}
```

Or directly with `useClient()`:

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

### `DbProvider`

A React context provider that creates a single `useClient()` instance and shares it with all child components via `useDb()`.

```tsx
<DbProvider options={{ databaseName: "app-db", migrations: loadMigrations }}>
	{children}
</DbProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `options` | `ClientOptions` | Database name and optional migrations |
| `children` | `React.ReactNode` | Child components that can call `useDb()` |

### `useDb()`

Returns the `DbClient` from the nearest `DbProvider`. Throws if used outside a provider.

```ts
const client = useDb();
```

### Root exports

- `useClient(options)`
- `DbProvider`
- `useDb()`
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
