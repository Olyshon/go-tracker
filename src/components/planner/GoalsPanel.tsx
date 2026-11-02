import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import type { Goal } from "@/lib/planner-store";
import { Panel, SectionTitle } from "./ui-bits";
import { cn } from "@/lib/utils";
import { DeleteConfirmation } from './DeleteConfirmation';

type Props = {
  goals: Goal[];
  onToggle: (id: string) => void;
  onAdd: (title: string) => void;
  onUpdate: (id: string, title: string) => void;
  onRemove: (id: string) => void;
};

export function GoalsPanel({ goals, onToggle, onAdd, onUpdate, onRemove }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [removing, setRemoving] = useState<Goal | null>(null);

  return (
    <Panel className="p-4">
      <SectionTitle>Цели месяца</SectionTitle>
      {!goals.length && <p className="py-2 text-sm text-muted-foreground">Новый месяц — новые цели.</p>}
      <ol>
        {goals.map((g, i) => (
          <li
            key={g.id}
            className="group grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/70 py-1.5 last:border-b-0"
          >
            <span className="text-xs tabular-nums text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            {editingId === g.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  if (draft.trim()) onUpdate(g.id, draft.trim());
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="w-full rounded-sm border-b border-border bg-transparent text-sm outline-none focus:border-olive"
              />
            ) : (
              <button
                type="button"
                onClick={() => onToggle(g.id)}
                className={cn(
                  "min-w-0 truncate text-left text-sm transition-colors",
                  g.done && "text-muted-foreground line-through",
                )}
              >
                {g.title}
              </button>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Редактировать цель"
                onClick={() => {
                  setEditingId(g.id);
                  setDraft(g.title);
                }}
                className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100 focus:opacity-100"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Удалить цель"
                onClick={() => setRemoving(g)}
                className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100 focus:opacity-100"
              >
                <X className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Отметить цель"
                aria-pressed={g.done}
                onClick={() => onToggle(g.id)}
                className={cn(
                  "ml-1 grid size-5 shrink-0 place-items-center rounded-[4px] border transition-colors",
                  g.done
                    ? "border-olive bg-olive text-primary-foreground"
                    : "border-border-strong bg-background hover:border-olive",
                )}
              >
                {g.done && <Check className="size-3.5" />}
              </button>
            </div>
          </li>
        ))}
      </ol>

      {adding ? (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newTitle.trim()) onAdd(newTitle.trim());
              setNewTitle("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Новая цель"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-olive"
            />
            <button
              type="submit"
              className="rounded-md bg-olive px-3 py-1.5 text-xs text-primary-foreground"
            >
              Добавить
            </button>
          </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-olive"
          >
          <Plus className="size-3.5" /> Добавить цель
        </button>
      )}
      <DeleteConfirmation name={removing?.title ?? null}
        description="Цель и её статус выполнения будут удалены из выбранного месяца. Действие нельзя отменить."
        onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) onRemove(removing.id); setRemoving(null); }} />
    </Panel>
  );
}
