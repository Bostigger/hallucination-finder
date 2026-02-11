const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

// Node.js built-in modules to ignore
const BUILTINS = new Set([
  "assert", "async_hooks", "buffer", "child_process", "cluster",
  "console", "constants", "crypto", "dgram", "diagnostics_channel",
  "dns", "domain", "events", "fs", "http", "http2", "https",
  "inspector", "module", "net", "os", "path", "perf_hooks",
  "process", "punycode", "querystring", "readline", "repl",
  "stream", "string_decoder", "sys", "timers", "tls", "trace_events",
  "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib",
  // Node prefixed versions
  "node:assert", "node:async_hooks", "node:buffer", "node:child_process",
  "node:cluster", "node:console", "node:constants", "node:crypto",
  "node:dgram", "node:diagnostics_channel", "node:dns", "node:domain",
  "node:events", "node:fs", "node:http", "node:http2", "node:https",
  "node:inspector", "node:module", "node:net", "node:os", "node:path",
  "node:perf_hooks", "node:process", "node:punycode", "node:querystring",
  "node:readline", "node:repl", "node:stream", "node:string_decoder",
  "node:sys", "node:timers", "node:tls", "node:trace_events", "node:tty",
  "node:url", "node:util", "node:v8", "node:vm", "node:wasi",
  "node:worker_threads", "node:zlib", "node:test",
]);

// Patterns to extract package names from code
const IMPORT_PATTERNS = [
  // ES6: import ... from 'package'
  /import\s+(?:[\w{}\s,*]+\s+from\s+)?['"]([^'".\\/][^'"]*)['"]/g,
  // CommonJS: require('package')
  /require\s*\(\s*['"]([^'".\\/][^'"]*)['"]\s*\)/g,
  // Dynamic import: import('package')
  /import\s*\(\s*['"]([^'".\\/][^'"]*)['"]\s*\)/g,
];

/**
 * Extract the base package name from an import string
 * e.g., "lodash/merge" -> "lodash"
 * e.g., "@scope/package/util" -> "@scope/package"
 */
function getPackageName(importStr) {
  if (importStr.startsWith("@")) {
    // Scoped package: @scope/package
    const parts = importStr.split("/");
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return importStr;
  }
  // Regular package: just the first part
  return importStr.split("/")[0];
}

/**
 * Check if a package name looks valid (not a relative path, not builtin)
 */
function isExternalPackage(name) {
  if (!name || name.length === 0) return false;
  if (name.startsWith(".")) return false;
  if (name.startsWith("/")) return false;
  if (BUILTINS.has(name)) return false;
  if (BUILTINS.has(name.replace("node:", ""))) return false;
  return true;
}

/**
 * Scan a single file and return found imports with line numbers
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const imports = [];

  lines.forEach((line, index) => {
    for (const pattern of IMPORT_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const raw = match[1];
        const packageName = getPackageName(raw);
        if (isExternalPackage(packageName)) {
          imports.push({
            packageName,
            raw,
            file: filePath,
            line: index + 1,
            lineContent: line.trim(),
          });
        }
      }
    }
  });

  return imports;
}

/**
 * Scan an entire directory for JS/TS files and extract all imports
 */
async function scanDirectory(dir) {
  const patterns = [
    "**/*.js",
    "**/*.jsx",
    "**/*.ts",
    "**/*.tsx",
    "**/*.mjs",
    "**/*.cjs",
  ];

  const ignorePatterns = [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**",
    "**/vendor/**",
    "**/*.min.js",
    "**/*.bundle.js",
  ];

  const files = await glob(patterns, {
    cwd: dir,
    ignore: ignorePatterns,
    absolute: true,
    nodir: true,
  });

  const allImports = [];
  const scannedFiles = [];

  for (const file of files) {
    try {
      const imports = scanFile(file);
      allImports.push(...imports);
      scannedFiles.push(file);
    } catch (err) {
      // Skip files we can't read
    }
  }

  // Deduplicate by package name, but keep all locations
  const packageMap = new Map();
  for (const imp of allImports) {
    if (!packageMap.has(imp.packageName)) {
      packageMap.set(imp.packageName, {
        packageName: imp.packageName,
        locations: [],
      });
    }
    packageMap.get(imp.packageName).locations.push({
      file: imp.file,
      line: imp.line,
      lineContent: imp.lineContent,
    });
  }

  return {
    packages: Array.from(packageMap.values()),
    filesScanned: scannedFiles.length,
    totalImports: allImports.length,
  };
}

module.exports = { scanDirectory, scanFile, getPackageName, isExternalPackage };
