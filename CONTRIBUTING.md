# Contributing to KarmaMap

Thank you for investing your time in KarmaMap! We're building a platform that helps NGOs connect with skilled volunteers, and every contribution matters.

## Code of Conduct

This project adheres to the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior by opening an issue.

## How to Contribute

### 1. Find or Create an Issue

- Browse [open issues](https://github.com/AshayK003/KarmaMap/issues) for something that interests you
- If you're planning a new feature or architectural change, **open an issue first** to discuss it before writing code
- Label your issue appropriately (`bug`, `enhancement`, `documentation`, `good first issue`)

### 2. Set Up Your Development Environment

```bash
# Fork the repo
gh repo fork AshayK003/KarmaMap --clone

# Or clone directly if you have write access
git clone https://github.com/AshayK003/KarmaMap.git
cd KarmaMap

# Backend
cd backend
cp .env.example .env
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install
```

See the [README](README.md#quick-start) for full Supabase and environment setup instructions.

### 3. Make Your Changes

```bash
# Create a feature branch from main
git checkout -b feature/my-change

# Keep your changes focused — one feature/fix per branch
# Follow the existing code style (Biome is configured)
```

**Code style guidelines:**
- Run `npm run lint` before committing (both `backend/` and `frontend/`)
- Use TypeScript — no `any` types unless absolutely necessary
- Write tests for new functionality
- Keep functions small and focused
- Use meaningful variable names

### 4. Test Your Changes

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Run lint
npm run lint
```

Ensure the test suite passes before submitting. If you're adding new functionality, include corresponding tests.

### 5. Submit a Pull Request

1. Push your branch: `git push origin feature/my-change`
2. Open a PR against the `main` branch
3. Fill in the PR template (it will auto-populate)
4. Link any related issues

**PR guidelines:**
- Keep PRs small and focused — aim for < 400 lines changed
- Write a clear title and description explaining what and why
- Include screenshots for UI changes
- Ensure CI passes (lint + tests)

## What to Contribute

### High-value areas

- **Bug fixes** — Check the [issues list](https://github.com/AshayK003/KarmaMap/issues) for confirmed bugs
- **Test coverage** — Edge cases, integration tests, stress tests
- **Documentation** — Clarify setup steps, add examples, improve architecture docs
- **UI/UX polish** — Accessibility improvements, responsive design fixes, loading states
- **Performance** — Query optimization, bundle size reduction, caching

### What to avoid

- **New dependencies** — Open an issue first to discuss. We keep the dependency footprint minimal.
- **Core matching algorithm changes** — Without first understanding [`docs/architecture/`](docs/architecture/) and the existing algorithm
- **Large refactors** — Break into smaller, reviewable PRs with separate issues

## Getting Help

- Open a [discussion](https://github.com/AshayK003/KarmaMap/discussions) for questions
- Tag maintainers in your issue for urgent matters
- Check existing [`docs/`](docs/) for architecture context and ADRs

## Recognition

Contributors will be recognized in the project's README and release notes. We believe in celebrating everyone who helps make KarmaMap better.
