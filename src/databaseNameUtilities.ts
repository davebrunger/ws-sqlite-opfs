export function buildDbUri(databaseName: string) {
    return `file:${databaseName.replaceAll("'", "''")}.sqlite3?vfs=opfs`
}

export function buildDFilename(databaseName: string) {
    return `${databaseName.replaceAll("'", "''")}.sqlite3`
}

export function buildBackupDbUri(databaseName: string, date = new Date()) {
    const stamp = date.toISOString().slice(0, 10);
    return `file:${databaseName}.backup.${stamp}.sqlite3?vfs=opfs`;
}

export function buildBackupDbFilename(databaseName: string, date = new Date()) {
    const stamp = date.toISOString().slice(0, 10);
    return `${databaseName}.backup.${stamp}.sqlite3`;
}
