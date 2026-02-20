type SqlValue = null | number | string | Uint8Array

type MessageTypes = "close" | "config-get" | "exec" | "open";

type MessageArgs = {
    readonly messageId?: any;
};

type DbMessageArgs = MessageArgs & {
    readonly dbId?: string;
};

type CloseMessageArgs = DbMessageArgs & {
    readonly unlink?: boolean;
};

type ConfigGetMessageArgs = MessageArgs;

type ExecMessageArgs = DbMessageArgs & {
    readonly sql: string;
    readonly bind? : SqlValue[];
    readonly returnValue? : "this" | "resultRows" | "saveSql";
};

type OpenMessageArgs = MessageArgs & {
    readonly filename: string;
    readonly vfs?: string;
};

type PromiserParams = {
    readonly close: CloseMessageArgs;
    readonly "config-get": ConfigGetMessageArgs;
    readonly exec: ExecMessageArgs;
    readonly open: OpenMessageArgs;
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type IsNever<T> = [T] extends [UnionToIntersection<T>] ? true : false;

type Values<T> = T[keyof T]

type AllOverloads<Mappings, Keys extends string> = {
    [Prop in Keys] : Prop extends keyof Mappings
        ? (key : Prop, data : Mappings[Prop]) => Promise<any>
        : (key : Prop) => Promise<any>;
}

type Overloading<Mappings, Keys extends string> =
    keyof Mappings extends Keys
        ? UnionToIntersection<Values<AllOverloads<Mappings, Keys>>>
        : never

type Sqlite3Worker1Promiser = Overloading<PromiserParams, MessageTypes>;

declare module "@sqlite.org/sqlite-wasm" {
    export const sqlite3Worker1Promiser: (config?: any) => Promise<Sqlite3Worker1Promiser>;
    const defaultExport: any;
    export default defaultExport;
};