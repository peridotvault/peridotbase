import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createConfig } from "@peridotvault/peridotbase-config/eslint/preset";

export default createConfig({
	rootDir: dirname(fileURLToPath(import.meta.url)),
});
