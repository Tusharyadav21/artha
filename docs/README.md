# Artha — Planning Documents

The six documents that exist before anyone builds (or extends) Artha. Read in order.

| # | Document | Answers |
|---|----------|---------|
| 1 | [Product Requirements](./01-product-requirements.md) | What does it do, feature by feature, and what counts as done? |
| 2 | [Technical Requirements](./02-technical-requirements.md) | What is it built on, where does it run, what does it talk to? |
| 3 | [App Flow](./03-app-flow.md) | What happens on every screen and click, including failures? |
| 4 | [Design Brief](./04-design-brief.md) | How should every screen look? |
| 5 | [Database Schema](./05-database-schema.md) | What data is stored, where, and who can see it? |
| 6 | [Implementation Plan](./06-implementation-plan.md) | What is built in what order, and what is signed off at each stage? |

## Pre-build check

Tick a box only if you have read the document.

- [ ] A feature list I've read and agreed to (01)
- [ ] The tools it runs on, written down and fixed (02)
- [ ] A map of every page and what each click does (03)
- [ ] A design brief that matches our brand (04)
- [ ] A plan for where client data lives and who sees it (05)
- [ ] A build order with points where I sign off (06)

6 ticked: build. 3–5: write the missing ones first. 0–2: stop. **Never skip 05.**

## Status of this set

These were written against the code as of the `eba1716` commit. Where the repo's older docs
disagree with the code, the code wins and the gap is listed in
[02 §9](./02-technical-requirements.md#9-known-documentation-drift) so it can be resolved.
