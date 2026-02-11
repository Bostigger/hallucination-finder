# 🔍 hallucination-finder

**Find AI-hallucinated packages hiding in your codebase.**

> *"You vibe coded it. But can you own it?"*

AI coding assistants (ChatGPT, Copilot, Claude, etc.) sometimes hallucinate npm packages that **don't actually exist**. These phantom imports slip into your codebase, silently breaking builds or — worse — opening the door to [dependency confusion attacks](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610) where bad actors register the hallucinated package name with malicious code.

`hallucination-finder` scans your JavaScript/TypeScript project, checks every imported package against the npm registry, and tells you which ones are **completely made up**.

---

## ⚡ Quick Start

```bash
# Scan current directory
npx hallucination-finder

# Scan a specific project
npx hallucination-finder ./my-project

# Get JSON output (great for CI)
npx hallucination-finder --json

# Save report to file
npx hallucination-finder --output report.json
```

## 📦 Install

```bash
# Global install
npm install -g hallucination-finder

# Or as a dev dependency
npm install --save-dev hallucination-finder
```

## 🔎 What It Does

1. **Scans** all `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs` files in your project
2. **Extracts** every `import` and `require()` statement
3. **Filters out** local imports, Node.js built-ins, and relative paths
4. **Checks** each package against the npm registry
5. **Reports** which packages are hallucinated (don't exist)

## 🚨 Example Output

```
 🚨 Found 3 hallucinated packages!

  1. react-smooth-carousel ← does NOT exist on npm
     📍 src/components/Hero.jsx:3
        import { Carousel } from 'react-smooth-carousel'

  2. express-auth-helper ← does NOT exist on npm
     📍 src/middleware/auth.js:1
        const auth = require('express-auth-helper')

  3. @utils/smart-cache ← does NOT exist on npm
     📍 src/lib/cache.ts:2
        import { SmartCache } from '@utils/smart-cache'

 ⚠️  What to do:
    These packages were likely hallucinated by an AI coding assistant.
    Check if a real alternative exists, or if the code needs rewriting.
```

## 🤖 Why This Matters

With AI-assisted coding becoming the norm, hallucinated packages are a **real and growing problem**:

- **Build failures**: Your code imports something that doesn't exist, and nobody notices until deploy day
- **Security risk**: Attackers can register hallucinated package names and inject malicious code ([supply chain attacks](https://www.bleepingcomputer.com/news/security/ai-hallucinated-code-dependencies-become-a-new-supply-chain-risk/))
- **Time wasted**: Debugging "module not found" errors from AI-generated code
- **False confidence**: Your code looks complete but references phantom dependencies

## 🛠️ Use in CI/CD

`hallucination-finder` exits with code `1` if hallucinations are found, making it perfect for CI pipelines:

```yaml
# GitHub Actions
- name: Check for hallucinated packages
  run: npx hallucination-finder .
```

```yaml
# GitLab CI
hallucination-check:
  script:
    - npx hallucination-finder .
```

## 📡 Programmatic API

```javascript
const { findHallucinations } = require('hallucination-finder');

const results = await findHallucinations('./my-project', {
  concurrency: 8,          // parallel registry checks
  onProgress: (current, total, name) => {
    console.log(`Checking ${current}/${total}: ${name}`);
  }
});

console.log(results.hallucinations); // packages that don't exist
console.log(results.scanInfo);       // scan statistics
console.log(results.jsonReport);     // full JSON report
```

## 🧠 How It Works

The scanner uses regex patterns to detect:
- ES6 imports: `import X from 'package'`
- CommonJS: `require('package')`
- Dynamic imports: `import('package')`

It automatically ignores:
- Relative imports (`./utils`, `../lib`)
- Node.js built-ins (`fs`, `path`, `crypto`, etc.)
- `node_modules/`, `dist/`, `build/` directories
- Minified and bundled files

Each unique package name is then checked against the npm registry API. Packages returning a `404` are flagged as hallucinations.

## 🗺️ Roadmap

This is part of a bigger vision. Coming soon:

- **code-decay** — Freshness scores for your files
- **vibe-check** — Get quizzed on your own code before deploying
- **karma** — Your developer write/understand/test ratio
- **vibe-audit** — The all-in-one suite

## 📄 License

MIT

---

**Built for the vibe coding era.** ✌️
