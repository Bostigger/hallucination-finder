const { scanDirectory } = require("./scanner");
const { checkPackages, isInPackageJson } = require("./checker");
const { generateJsonReport } = require("./reporter");

/**
 * Run hallucination-finder on a directory
 * @param {string} dir - Directory to scan
 * @param {object} options - Options
 * @param {boolean} options.checkRegistry - Whether to check npm registry (default: true)
 * @param {number} options.concurrency - Concurrent registry checks (default: 8)
 * @param {function} options.onProgress - Progress callback
 * @returns {object} Results with hallucinations found
 */
async function findHallucinations(dir, options = {}) {
  const { checkRegistry = true, concurrency = 8, onProgress } = options;

  // Step 1: Scan all files for imports
  const scanResult = await scanDirectory(dir);

  if (scanResult.packages.length === 0) {
    return {
      hallucinations: [],
      scanInfo: {
        filesScanned: scanResult.filesScanned,
        totalImports: 0,
        uniquePackages: 0,
      },
    };
  }

  // Step 2: Filter out packages that are in package.json
  // (they might still be hallucinated, but at least someone intended to use them)
  const packagesToCheck = scanResult.packages;

  // Step 3: Check each package against the npm registry
  let results;
  if (checkRegistry) {
    results = await checkPackages(packagesToCheck, { concurrency, onProgress });
  } else {
    results = packagesToCheck.map((p) => ({ ...p, exists: true }));
  }

  // Step 4: Separate hallucinations from real packages
  const hallucinations = results.filter((r) => !r.exists && !r.error);
  const skipped = results.filter((r) => r.error);

  const scanInfo = {
    filesScanned: scanResult.filesScanned,
    totalImports: scanResult.totalImports,
    uniquePackages: scanResult.packages.length,
  };

  return {
    hallucinations,
    skipped,
    scanInfo,
    jsonReport: generateJsonReport(hallucinations, scanInfo),
  };
}

module.exports = { findHallucinations };
