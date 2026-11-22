# HELEN

Command-line interface for structured engineering task tracking, context extraction, and workflow evaluation.

## Tech Stack

- **Runtime & Language:** Node.js 18+, TypeScript
- **CLI Framework:** Commander.js, `@clack/prompts`, Picocolors, Ora
- **Validation & Templating:** Zod, Handlebars, `@anthropic-ai/sdk`
- **Testing & Quality:** Vitest, ESLint, Prettier

## Architecture & Key Decisions

- **Structured Task Records (`helen work`):** Manages explicit technical dossiers containing requirements, exclusions, and acceptance criteria in localized Markdown files.
- **Context Filtering (`helen context`):** Extracts targeted code slices and dependencies for specific tasks to minimize token consumption in agentic workflows.
- **Knowledge Catalog (`helen knowledge`):** Searchable index of architectural decision records and reusable engineering patterns.
- **Evaluation Runner:** Automates prompt and skill evaluation suites against defined test cases with structured JSON test output.

## Local Setup

### Prerequisites

- Node.js 18+

### Installation & Build

```bash
git clone https://github.com/eneekoruiz/helen.git
cd helen
npm install
npm run build
```

### Usage

```bash
# Execute CLI directly
node dist/index.js --help

# Link globally for development
npm link
helen --help
```

### Verification

```bash
# Run type check, linter, formatting check, and unit tests
npm run validate
```
