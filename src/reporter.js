const chalk = require("chalk");
const path = require("path");

const LOGO = `
 █░█ ▄▀█ █░░ █░░ █░█ █▀▀ █ █▄░█ ▄▀█ ▀█▀ █ █▀█ █▄░█
 █▀█ █▀█ █▄▄ █▄▄ █▄█ █▄▄ █ █░▀█ █▀█ ░█░ █ █▄█ █░▀█
 █▀▀ █ █▄░█ █▀▄ █▀▀ █▀█
 █▀░ █ █░▀█ █▄▀ ██▄ █▀▄
`;

function printHeader() {
  console.log(chalk.red.bold(LOGO));
  console.log(
    chalk.gray(
      " Find AI-hallucinated packages hiding in your codebase\n"
    )
  );
  console.log(chalk.gray(" ─".repeat(30)));
  console.log();
}

function printScanSummary(filesScanned, totalImports, uniquePackages) {
  console.log(chalk.white.bold(" 📊 Scan Summary"));
  console.log(chalk.gray(` Files scanned:    ${filesScanned}`));
  console.log(chalk.gray(` Total imports:    ${totalImports}`));
  console.log(chalk.gray(` Unique packages:  ${uniquePackages}`));
  console.log();
}

function printResults(hallucinations, projectDir) {
  if (hallucinations.length === 0) {
    console.log(
      chalk.green.bold(" ✅ No hallucinated packages found!")
    );
    console.log(
      chalk.green(
        "    Your codebase looks clean. All imported packages exist on npm.\n"
      )
    );
    return;
  }

  console.log(
    chalk.red.bold(
      ` 🚨 Found ${hallucinations.length} hallucinated package${hallucinations.length === 1 ? "" : "s"}!\n`
    )
  );

  hallucinations.forEach((h, index) => {
    console.log(
      chalk.red.bold(`  ${index + 1}. `) +
        chalk.white.bold(h.packageName) +
        chalk.red(" ← does NOT exist on npm")
    );

    h.locations.forEach((loc) => {
      const relativePath = path.relative(projectDir, loc.file);
      console.log(
        chalk.gray(`     📍 ${relativePath}:${loc.line}`)
      );
      console.log(
        chalk.gray(`        ${loc.lineContent}`)
      );
    });
    console.log();
  });

  console.log(chalk.yellow.bold(" ⚠️  What to do:"));
  console.log(
    chalk.yellow(
      "    These packages were likely hallucinated by an AI coding assistant."
    )
  );
  console.log(
    chalk.yellow(
      "    Check if a real alternative exists, or if the code needs rewriting.\n"
    )
  );
}

function printSkipped(skippedPackages) {
  if (skippedPackages.length > 0) {
    console.log(
      chalk.gray(
        ` ℹ️  ${skippedPackages.length} package${skippedPackages.length === 1 ? "" : "s"} skipped (network errors)\n`
      )
    );
  }
}

function printFooter() {
  console.log(chalk.gray(" ─".repeat(30)));
  console.log(
    chalk.gray(' "You vibe coded it. But can you own it?"')
  );
  console.log(
    chalk.gray("  https://github.com/hallucination-finder\n")
  );
}

/**
 * Generate a JSON report
 */
function generateJsonReport(hallucinations, scanInfo) {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      filesScanned: scanInfo.filesScanned,
      totalImports: scanInfo.totalImports,
      uniquePackages: scanInfo.uniquePackages,
      hallucinationsFound: hallucinations.length,
    },
    hallucinations: hallucinations.map((h) => ({
      package: h.packageName,
      locations: h.locations.map((l) => ({
        file: l.file,
        line: l.line,
      })),
    })),
  };
}

module.exports = {
  printHeader,
  printScanSummary,
  printResults,
  printSkipped,
  printFooter,
  generateJsonReport,
};
