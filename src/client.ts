import * as React from "react";
import { sqlite3Worker1Promiser } from "@sqlite.org/sqlite-wasm";
import { applyMigrations, MigrationsProvider, resolveMigrations } from "./migrations";
import { buildBackupDbUri, buildDbUri } from "./databaseNameUtilities";

type ExecMethod = 'run' | 'all' | 'values' | 'get';
type ExecResult = { rows: any[] };
type SqlValue = any;

export type ClientOptions = {
    readonly databaseName: string;
    readonly migrations?: MigrationsProvider;
};

export type DbHandle = {
    readonly promiser: Sqlite3Worker1Promiser;
    readonly dbId: string;
    readonly databaseName: string
}

export type DbClient = {
    readonly openDb: () => Promise<DbHandle>;
    readonly exec: (sql: string, params: any[], method: ExecMethod) => Promise<ExecResult>;
    readonly close: () => Promise<void>;
    readonly vacuumInto: (targetDatabaseName: string) => Promise<void>
    readonly switchDb: (newConfig: ClientOptions) => Promise<void>
}

export function useClient(initialOptions: ClientOptions): DbClient {

    const options = React.useRef(initialOptions);
    const handle = React.useRef<DbHandle | undefined>(undefined);
    const openingHandle = React.useRef<Promise<DbHandle> | undefined>(undefined);
    const worker = React.useRef<Worker | undefined>(undefined)

    React.useEffect(() => {
        options.current = initialOptions;
    }, [initialOptions.databaseName, initialOptions.migrations]);

    const openDb = React.useCallback(async (): Promise<DbHandle> => {

        if (handle.current) {
            return handle.current;
        }
        if (openingHandle.current) {
            return openingHandle.current
        }

        openingHandle.current = (async () => {
            // Avoids potential timing issues
            // Just using:
            //     const promiser = sqlite3Worker1Promiser();
            // Can cause problems on slower machines
            const promiser: Sqlite3Worker1Promiser = await new Promise((resolve, reject) => {
                const p = sqlite3Worker1Promiser({
                    onready: () => resolve(p as any),
                    onerror: (e: any) => reject(e),
                });
                worker.current = (p as any).worker ?? worker.current;
            });

            const { databaseName, migrations } = options.current;

            const openResult = await promiser("open", { filename: buildDbUri(databaseName) });
            const dbId = openResult.dbId;

            const migrationsToRun = await resolveMigrations(migrations);
            if (migrationsToRun.length) {
                await applyMigrations(promiser, dbId, migrationsToRun)
            }

            const newHandle = { promiser, dbId, databaseName };
            handle.current = newHandle;
            return newHandle;
        })();

        try {
            return await openingHandle.current;
        }
        catch (e: any) {
            openingHandle.current = undefined;
            throw e;
        }
    }, []);

    const exec = React.useCallback(async (sql: string, params: SqlValue[], method: ExecMethod): Promise<ExecResult> => {
        const { promiser, dbId } = await openDb();
        const returnValue = method === "all" ? "resultRows" : undefined;
        const execResult = await promiser("exec", { dbId, sql, bind: params, returnValue });
        const rows: any[] = method === "all" ? (execResult?.result?.resultRows ?? []) : [];
        return { rows };
    }, [openDb]);

    const close = React.useCallback(async () => {
        const currentHandle = handle.current ?? (openingHandle.current
            ? await openingHandle.current.catch(() => undefined)
            : undefined);
        openingHandle.current = undefined;

        if (currentHandle) {
            try {
                await currentHandle.promiser("close", { dbId: currentHandle.dbId });
            } finally {
                handle.current = undefined;
            }
        }

        if (worker.current) {
            worker.current.terminate();
            worker.current = undefined;
        }

    }, []);

    const vacuumInto = React.useCallback(async (targetDatabaseName: string) => {
        const { promiser, dbId } = await openDb();
        await promiser("exec", {
            dbId,
            sql: "VACUUM INTO ?",
            bind: [buildBackupDbUri(targetDatabaseName)]
        });
    }, [openDb]);

    const switchDb = React.useCallback(async (newConfig: ClientOptions) => {
        await close();
        options.current = newConfig;
    }, [close])

    return { openDb, exec, close, vacuumInto, switchDb };
}