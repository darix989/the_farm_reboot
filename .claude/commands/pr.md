---
description: Draft a PR body matching .github/pull_request_template.md, and optionally open it
argument-hint: [base-branch]
allowed-tools: Bash(git *), Bash(gh pr *)
---

Draft (and, if approved, open) a PR for the current branch against `$ARGUMENTS` (default `main` if empty).

1. **Inspect the diff.** `git diff <base>...HEAD --stat` and `git log <base>..HEAD --oneline` to see every commit going in, not just the latest one.
2. **Check for leaks before drafting anything.** This repo has twice shipped `.claude/settings.local.json` inside a product PR, and once shipped a stray `PR_DESCRIPTION.md`. If either appears in the diff, flag it and ask whether to drop it from the branch before continuing — don't silently include or silently exclude, since it might be intentional.
3. **Read `.github/pull_request_template.md`** and reproduce every one of its headings verbatim (`# Summary`, `# High-level changes`, `# How to validate`, `# Docs update`) — do not rename, merge, or drop any of them.
   - `# Summary`: what changed and why, from the actual diff and commit messages.
   - `# High-level changes`: which screens/flows are affected — phrase this for a non-developer reading it, per the template's own instructions.
   - `# How to validate`: concrete repro steps someone can follow manually.
   - `# Docs update`: this is the section that's normally guessed. Actually check whether the diff touches anything documented in `README.md`, `docs/developer.md`, `AGENTS.md`, or `CHANGELOG.md`, and either name what needs updating or state plainly that nothing does.
4. **Keep it short — this is the rule that gets broken most.** Aim for roughly half the length you first want to write; a draft that feels complete is usually about twice as long as it should be. Per section:

   - `# Summary`: **no more than 4 lines.** What changed and why, nothing else. Not an inventory of supporting changes.
   - `# High-level changes`: **this is where the core information goes** — the section carrying the weight of the PR. A bullet per affected screen/flow, plus bullets for the substantive mechanics a reviewer needs (a new setting, a behaviour change, a bug fixed along the way, what is deliberately out of scope). Still one line each; no nested sub-explanations.
   - `# How to validate`: a single numbered list, not one list per theme. This is the one section allowed to run long — if the change genuinely needs a dozen steps to exercise, write them; just don't pad it to look thorough.
   - `# Docs update`: one line per touched doc, without restating what the doc now says.

   Design rationale, trade-offs and "why it was done this way" belong in code comments and `AGENTS.md`/`docs/`, not in the PR body — the diff is the detail, the PR body is the orientation. Reviewers skim this.

5. **Propose a conventional-commit-shaped title** for the PR (`feat: ...` / `fix: ...` / `chore: ...`) even though GitHub squash-merges bypass commitlint — this repo's convention is that titles look conventional anyway.
6. **Emit the drafted body inside a single fenced ` ```markdown ` code block** so the raw template markdown is copy-pasteable (chat UIs otherwise render `#` headings and make the body hard to copy into GitHub). Put the suggested title outside that fence.
7. **Ask before running `gh pr create`** — opening a PR is visible to the whole team. If a PR already exists for this branch, offer to update its description instead (`gh pr edit`) rather than creating a duplicate. When the user only asked for a PR _description_ (not to open/create the PR), stop after step 6 — do not create or edit the PR.
