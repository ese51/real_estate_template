declare const __dirname: string;
declare const process: {
  platform: string;
  argv: string[];
  env: Record<string, string | undefined>;
  stdout: { write: (value: string) => void };
  stderr: { write: (value: string) => void };
  exitCode?: number;
  cwd: () => string;
};
declare const Buffer: {
  from: (input: ArrayBuffer) => unknown;
};
declare function setTimeout(callback: () => void, delay: number): unknown;
declare function clearTimeout(timeoutId: unknown): void;
declare class URL {
  constructor(input: string);
  origin: string;
}
declare class AbortController {
  signal: unknown;
  abort(): void;
}
declare function fetch(input: string, init?: {
  headers?: Record<string, string>;
  redirect?: string;
  signal?: unknown;
}): Promise<{
  ok: boolean;
  status: number;
  headers?: {
    entries?: () => IterableIterator<[string, string]>;
  };
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

declare module 'node:fs' {
  export const promises: {
    access: (...args: unknown[]) => Promise<void>;
    mkdir: (...args: unknown[]) => Promise<void>;
    rm: (...args: unknown[]) => Promise<void>;
    readdir: (...args: unknown[]) => Promise<Array<{
      name: string;
      isDirectory: () => boolean;
      isFile: () => boolean;
    }>>;
    stat: (...args: unknown[]) => Promise<{ isFile: () => boolean; size: number }>;
    copyFile: (...args: unknown[]) => Promise<void>;
    writeFile: (...args: unknown[]) => Promise<void>;
    readFile: (...args: unknown[]) => Promise<string>;
  };
}

declare module 'node:path' {
  const path: {
    resolve: (...parts: string[]) => string;
    join: (...parts: string[]) => string;
    dirname: (value: string) => string;
    extname: (value: string) => string;
    basename: (value: string, ext?: string) => string;
  };
  export = path;
}

declare module 'node:child_process' {
  export function spawnSync(...args: unknown[]): {
    status: number | null;
    signal?: string | null;
    error?: { message: string };
    stdout?: string;
    stderr?: string;
  };
}
