<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store dated habit revisions in a versioned localStorage registry; keep goals and checks keyed by month and retain untouched legacy keys plus raw migration backups to protect user history.
- Apply habit edits at the selected month's first day; terminate habits instead of deleting revisions so past schedules and completion records remain available.
- Keep date-range helpers browser-safe and shared by the tracker and calculations so inactive dates use one inclusive rule.
- All application initialization and writes go through PlannerSession under one origin-scoped Web Lock with exact registry/legacy snapshot checks; block stale sessions instead of reconciling ambiguous history. Never write storage from a React state updater.
- Existing registries are read without rewriting or automatic repair; late legacy additions/changes block writes pending explicit reconciliation. Fresh migration treats omissions as non-terminations and preserves richer schedules over undated daily defaults, retaining raw snapshots for ambiguity.
