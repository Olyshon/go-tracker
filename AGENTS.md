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

- Authenticated tracker data uses normalized Cloud tables and transactional security-invoker RPCs, mapped to the existing PlannerData calculation contract; legacy localStorage code is retained but never called by the account-backed tracker.
- Apply habit edits at the selected month's first day; terminate habits instead of deleting revisions so past schedules and completion records remain available.
- Keep date-range helpers browser-safe and shared by the tracker and calculations so inactive dates use one inclusive rule.
- Cloud writes go through a serialized PlannerCloudSession and an owner-scoped version row locked in the transaction; stale or uncertain writes block editing until reload to prevent lost history.
- The dashboard lives under the authenticated layout at /dashboard; / and /auth are public account entry points. One root auth subscriber handles identity transitions and cache invalidation.
- All tracker tables enforce owner RLS and composite owner/habit foreign keys; account initialization returns empty data and never accesses legacy browser records.
