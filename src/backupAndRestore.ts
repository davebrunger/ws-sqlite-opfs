import type { DbClient } from "./client";
import { buildBackupDbFilename, buildBackupDbUri, buildDFilename } from "./databaseNameUtilities";

async function opfsReadFileBytes(filename: string): Promise<ArrayBuffer> {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(filename);
    const file = await handle.getFile();
    return await file.arrayBuffer();
}

async function opfsWriteFileBytes(filename: string, bytes: ArrayBuffer) {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable({ keepExistingData: false });
    await writable.write(bytes);
    await writable.close();
}

async function opfsDeleteFile(filename: string) {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(filename);
}

function downloadBytes(bytes: ArrayBuffer, downloadName: string) {
    const blob = new Blob([bytes], { type: "application/x-sqlite3" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export async function backupDatabase(client: DbClient) {
    const { databaseName } = await client.openDb();
    const file = buildBackupDbFilename(databaseName);
    await client.vacuumInto(databaseName);
    const bytes = await opfsReadFileBytes(file);
    downloadBytes(bytes, file);
    await opfsDeleteFile(file);
}

export async function restoreDatabase(client: DbClient, targetDatabaseName: string, file: File) {
    await client.close();
    const bytes = await file.arrayBuffer();
    await opfsWriteFileBytes(buildDFilename(targetDatabaseName), bytes);
    window.location.reload();
}
