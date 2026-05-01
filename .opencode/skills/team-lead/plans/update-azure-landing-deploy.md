# Plan: Update Azure GitHub Action for Landing Page Deployment

**Date**: 2026-05-01
**Task**: Fix Azure Static Web Apps CI/CD workflow to properly build the monorepo landing page (workspace deps resolution) and add SPA config.

## Subtasks

- [x] 1. Update Azure workflow — general — Add manual turbo build steps, skip_app_build: true, checkout v4, setup-node v4
- [x] 2. Add staticwebapp.config.json — landing-page — SPA navigation fallback + cache headers
- [x] 3. Code review: workflow + staticwebapp.config — code-reviewer
- [x] 4. QA: validate build pipeline — qa-tester
- [x] 5. Update .agent/ docs with deployment section — ora-components-docs
- [x] 6. Code review: .agent docs — code-reviewer
- [x] 7. QA: .agent docs — qa-tester
