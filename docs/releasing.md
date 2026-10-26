# Releasing a version

Every change that reaches production gets a version number, and a plain-words note of what changed.

1. Add a new entry at the **top** of `RELEASES` in `src/lib/changelog.ts`: version, date, a short title, and the changes (Added, Changed, Fixed, Removed, Security). Write them for finance and the committee, not for developers.
2. Set `"version"` in `package.json` to the same number. A test fails if they differ.
3. Run `npm run changelog` to regenerate `CHANGELOG.md`. A test fails if the file is out of date.
4. Run the checks (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`), commit, then tag: `git tag -a v0.2.3 -m "0.2.3: title"` and `git push origin main --tags`.
5. Deploy. The version shows in the admin header ("Release notes v0.2.3"), on the Release notes page, and in `/api/health`.

Numbering: a new sprint raises the middle number (0.2.x to 0.3.0); a fix, polish or QA pass raises the last (0.2.1 to 0.2.2). Version 1.0.0 is launch day.
