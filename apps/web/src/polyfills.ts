/**
 * Browser globals that `@solana/web3.js` and `@coral-xyz/anchor` assume. Imported first from
 * `main.tsx`, before any SDK module evaluates.
 */
import { Buffer } from "buffer";
import process from "process";

const scope = globalThis as unknown as {
	Buffer?: typeof Buffer;
	process?: typeof process;
	global?: typeof globalThis;
};

scope.Buffer ??= Buffer;
scope.process ??= process;
scope.global ??= globalThis;
