# Refactor: Remove Orphaned DeepSeek Credentials

**Date:** 2026-05-25
**Status:** Complete

## Motivation
`backend/.env` contained a `DEEPSEEK_API_KEY` and `DEEPSEEK_BASE_URL` that were not referenced anywhere in the codebase. Zero imports, zero usage. Orphaned credential on disk is a security liability — any filesystem read exposes a live API key to a third-party LLM provider.

## Scope
- `backend/.env` — remove `DEEPSEEK_API_KEY` and `DEEPSEEK_BASE_URL` lines

## Before
```
DEEPSEEK_API_KEY=sk-a2eb050c72514518a35630d6730b62d6
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

## After
Lines removed. The 6 remaining env vars are actively used.

## Migration Plan
1. Verify no file references `DEEPSEEK_API_KEY` or `DEEPSEEK_BASE_URL`
2. Remove lines from `backend/.env`
3. Rotate the key at DeepSeek dashboard (manual, outside codebase)

## Regression Risks
None — the variables were not consumed anywhere.

## Verification
- `rg DEEPSEEK` across entire repo returns only hits in docs files (audit records and priority matrix, now updated)
- All 121 tests pass
- Server starts and routes work normally
