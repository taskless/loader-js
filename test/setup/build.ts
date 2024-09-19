import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";

export const setup = async () => {
  const { stdout, stderr } = await execa({
    preferLocal: true,
    cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../../"),
  })`pnpm build`;
};
