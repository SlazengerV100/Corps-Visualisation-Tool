---
name: execute
description: Takes a GitHub issue in this repo from pick-up to a draft PR ready for testing, through explore, plan, execute, review and testing steps. Use when the user runs /execute with an issue number such as #38.
argument-hint: "#<issue-number>"
disable-model-invocation: true
---

# Execute an issue

Work issue `$ARGUMENTS` through to a draft PR the user can test. Do the steps in order and don't skip the plan approval.

## 1. Pick up the ticket

- Read the issue and its comments: `gh issue view <number> --comments`.
- Find its project item and status: `gh issue view <number> --json projectItems`.
- If the status isn't already **In progress**, set it. Look up the IDs with `gh project field-list <project-number> --owner SlazengerV100 --format json` and `gh project item-list <project-number> --owner SlazengerV100 --format json`, then `gh project item-edit --project-id <id> --id <item-id> --field-id <status-field-id> --single-select-option-id <in-progress-option-id>`.
- If the issue isn't in a project, say so and carry on.

## 2. Explore

Get familiar with the code the issue touches. Skip this when the context already covers it.

## 3. Plan

- List what you're going to do and any open questions.
- Ask the open questions with AskUserQuestion.
- Then ask with AskUserQuestion whether the plan is good to go, with the options **Execute** and **Changes needed**. On **Changes needed**, revise the plan and ask again.

## 4. Execute

- Create a worktree with EnterWorktree, named `<type>/<short-name>` (for example `fix/metric-chart-axis`). This checkout isn't in `~/Repos`, so don't add a repo prefix: the WorktreeCreate hook would take it as part of the branch name.
- Follow the `code-commenting` skill for every comment and the `commit-messages` skill for every commit.

## 5. Unit tests

Cover backend changes with unit tests and run them (`npm run test` in `backend`, scoped to the touched files).

## 6. Review

Once the unit tests pass, push the branch and open a draft PR that closes the issue (`Closes #<number>` in the body): `gh pr create --draft`. The title follows `commit-messages`; the body follows `pr-description`. CI runs the full test suite on the PR.

## 7. Manual testing

- **Frontend**: the user tests by hand. Start the app locally (`npm run dev` in `backend` and in `frontend`, in the background) and give them the URL and what to check.
- **Integration**: if the change needs it, run the app locally and exercise it end to end.

The user then merges the PR and deploys the image to dev by hand.
