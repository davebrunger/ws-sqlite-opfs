import * as React from "react";
import { useClient } from "./client";
import type { ClientOptions, DbClient } from "./client";

const DbContext = React.createContext<DbClient | null>(null);

export function DbProvider({ children, options }: { children: React.ReactNode; options: ClientOptions }) {
    const client = useClient(options);
    return React.createElement(DbContext.Provider, { value: client }, children);
}

export function useDb(): DbClient {
    const client = React.useContext(DbContext);
    if (!client) throw new Error("useDb must be used within a <DbProvider>");
    return client;
}
