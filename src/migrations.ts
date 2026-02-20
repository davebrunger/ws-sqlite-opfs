const createMigrationTable = `
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at INTEGER NOT NULL
    );
`;

const getMigrations = "SELECT name FROM __drizzle_migrations";

const addMigration = "INSERT INTO __drizzle_migrations (name, applied_at) VALUES (?, strftime('%s','now'))";

export type Migration = {
    readonly name: string;
    readonly sql: string;
}

export type MigrationsProvider =
    | Migration[]
    | (() => Migration[])
    | (() => Promise<Migration[]>)

export function resolveMigrations(migrationsProvider?: MigrationsProvider) {
    if (!migrationsProvider) {
        return Promise.resolve([]);
    }
    if (Array.isArray(migrationsProvider)) {
        return Promise.resolve(migrationsProvider);
    }
    try {
        const migrations = migrationsProvider();
        return Promise.resolve(migrations);
    }
    catch (e: any) {
        return Promise.reject(e);
    }
}

export async function applyMigrations(promiser: Sqlite3Worker1Promiser, dbId: string, migrations: Migration[]) {
    await promiser("exec", { dbId, sql: createMigrationTable });
    const { result } = await promiser("exec", { dbId, sql: getMigrations, returnValue: "resultRows" });
    const applied = new Set((result.resultRows as any[]).map(r => r[0] as string));
    for (const migration of migrations) {
        if (applied.has(migration.name)) {
            continue;
        }
        console.log("Applying migration", migration.name);
        await promiser("exec", { dbId, sql: "BEGIN" });
        try {
            await promiser("exec", { dbId, sql: migration.sql });
            await promiser("exec", { dbId, sql: addMigration, bind: [migration.name] });
            await promiser("exec", { dbId, sql: "COMMIT" });
        }
        catch (e) {
            await promiser("exec", { dbId, sql: "ROLLBACK" });
            throw e;
        }
    }
}
