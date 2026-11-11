import { fileURLToPath } from 'node:url';

// Single source of truth for path aliases, shared by Vite and Vitest.
// Keep in sync with "paths" in tsconfig.app.json.
const fromRoot = (relativePath: string): string =>
  fileURLToPath(new URL(relativePath, import.meta.url));

export const aliases: Record<string, string> = {
  '@': fromRoot('./src'),
  '@components': fromRoot('./src/components'),
  '@pages': fromRoot('./src/pages'),
  '@hooks': fromRoot('./src/hooks'),
  '@lib': fromRoot('./src/lib'),
};
