/**
 * Next.js configuration (ES module) — compatible with package.json "type": "module".
 */
import path from 'path';

const projectRoot = path.resolve(process.cwd());

export default {
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
  },
};
