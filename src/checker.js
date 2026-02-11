const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Check if a package exists on the npm registry
 * Uses curl for reliable proxy support across environments
 */
function checkPackageExists(packageName) {
  return new Promise((resolve) => {
    try {
      const encodedName = packageName.startsWith("@")
        ? `@${encodeURIComponent(packageName.slice(1))}`
        : encodeURIComponent(packageName);

      const url = `https://registry.npmjs.org/${encodedName}`;
      const result = execSync(
        `curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${url}"`,
        { timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }
      );
      const statusCode = parseInt(result.toString().trim(), 10);

      resolve({
        exists: statusCode === 200,
        status: statusCode,
      });
    } catch (err) {
      // Network error — assume exists to avoid false positives
      resolve({ exists: true, status: 0, error: true });
    }
  });
}

/**
 * Check if a package is listed in the local package.json dependencies
 */
function isInPackageJson(packageName, projectDir) {
  try {
    const pkgPath = path.join(projectDir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    };
    return packageName in allDeps;
  } catch {
    return false;
  }
}

/**
 * Check multiple packages with concurrency control
 */
async function checkPackages(packages, { concurrency = 5, onProgress } = {}) {
  const results = [];
  let completed = 0;

  for (let i = 0; i < packages.length; i += concurrency) {
    const batch = packages.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (pkg) => {
        const result = await checkPackageExists(pkg.packageName);
        completed++;
        if (onProgress) {
          onProgress(completed, packages.length, pkg.packageName);
        }
        return {
          ...pkg,
          ...result,
        };
      })
    );
    results.push(...batchResults);
  }

  return results;
}

module.exports = { checkPackageExists, checkPackages, isInPackageJson };
