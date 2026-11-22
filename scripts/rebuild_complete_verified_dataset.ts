/**
 * Authoritative Rebuild Script
 * Superseded by scripts/import_upto2026_stats.ts
 */

import { runImport } from './import_upto2026_stats';

if (require.main === module) {
  runImport();
}

export { runImport };
