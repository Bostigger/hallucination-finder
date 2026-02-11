#!/usr/bin/env node

const path = require("path");
const chalk = require("chalk");
const ora = require("ora");
const { findHallucinations } = require("../src/index");
const reporter = require("../src/reporter");
const fs = require("fs");

// Parse CLI args
const args = process.argv.slice(2);
const flags = {
  json: args.includes("--json"),
  help: args.includes("--help") || args.includes("-h"),
  version: args.includes("--version") || args.includes("-v"),
  output: null,
};

// Get --output flag
const outputIndex = args.indexOf("--output");
if (outputIndex !== -1 && args[outputIndex + 1]) {
  flags.output = args[outputIndex + 1];
}


// Get directory (first non-flag argument)
const dir = args.find((a) => !a.startsWith("-")) || ".";
const targetDir = path.resolve(dir);

if (flags.version) {
  const pkg = require("../package.json");
  console.log(pkg.version);
  process.exit(0);
}

if (flags.help) {
  console.log(`
${chalk.red.bold("hallucination-finder")} - Find AI-hallucinated packages in your code

${chalk.white.bold("USAGE")}
  $ hallucination-finder [directory] [options]

${chalk.white.bold("OPTIONS")}
  [directory]      Directory to scan (default: current directory)
  --json           Output results as JSON
  --output <file>  Save JSON report to a file
  -h, --help       Show this help message
  -v, --version    Show version number

${chalk.white.bold("EXAMPLES")}
  $ hallucination-finder
  $ hallucination-finder ./my-project
  $ hallucination-finder ./src --json
  $ hallucination-finder . --output report.json

${chalk.gray('"You vibe coded it. But can you own it?"')}
`);
  process.exit(0);
}

async function main() {
  if (!flags.json) {
    reporter.printHeader();
  }

  // Check if directory exists
  if (!fs.existsSync(targetDir)) {
    console.error(chalk.red(`\n  ❌ Directory not found: ${targetDir}\n`));
    process.exit(1);
  }

  const spinner = flags.json
    ? null
    : ora({
        text: " Scanning files for imports...",
        color: "yellow",
      }).start();

  try {
    const results = await findHallucinations(targetDir, {
      onProgress: (current, total, name) => {
        if (spinner) {
          spinner.text = ` Checking package ${current}/${total}: ${name}`;
        }
      },
    });

    if (spinner) {
      spinner.stop();
      console.log();
    }

    if (flags.json) {
      console.log(JSON.stringify(results.jsonReport, null, 2));
    } else {
      reporter.printScanSummary(
        results.scanInfo.filesScanned,
        results.scanInfo.totalImports,
        results.scanInfo.uniquePackages
      );

      reporter.printResults(results.hallucinations, targetDir);
      reporter.printSkipped(results.skipped || []);
      reporter.printFooter();
    }

    // Save report if requested
    if (flags.output) {
      fs.writeFileSync(
        flags.output,
        JSON.stringify(results.jsonReport, null, 2)
      );
      if (!flags.json) {
        console.log(
          chalk.green(`  📄 Report saved to ${flags.output}\n`)
        );
      }
    }

    // Exit with error code if hallucinations found (useful for CI)
    process.exit(results.hallucinations.length > 0 ? 1 : 0);
  } catch (err) {
    if (spinner) spinner.stop();
    console.error(chalk.red(`\n  ❌ Error: ${err.message}\n`));
    process.exit(1);
  }
}

main();
