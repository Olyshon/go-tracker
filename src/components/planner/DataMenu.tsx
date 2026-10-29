import { useRef, useState } from "react";
import { Download, MoreHorizontal, RotateCcw, Upload } from "lucide-react";
import type { MonthData } from "@/lib/planner-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  data: MonthData;
  fileLabel: string;
  onImport: (data: MonthData) => void;
  onReset: () => void;
  readOnly?: boolean;
};

export function DataMenu({ data, fileLabel, onImport, onReset, readOnly = false }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `go-tracker-${fileLabel}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as MonthData;
      onImport(parsed);
      setError("");
    } catch {
      setError("Не удалось импортировать файл. Проверьте формат; сохранённые данные не изменены.");
    }
  };

  return (
    <>
      {error && <p role="alert" className="max-w-64 text-xs text-destructive">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Данные месяца"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-olive hover:text-olive"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={exportJson}>
            <Download className="size-4" /> Экспорт данных месяца
          </DropdownMenuItem>
          <DropdownMenuItem disabled={readOnly} onSelect={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Импорт из JSON
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={readOnly}
            onSelect={() => setConfirmOpen(true)}
          >
            <RotateCcw className="size-4" /> Сброс прогресса
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сбросить прогресс месяца?</AlertDialogTitle>
            <AlertDialogDescription>
              Будут удалены все отметки привычек и снят статус выполнения целей за этот месяц.
              Действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={readOnly}
              onClick={() => {
                onReset();
                setConfirmOpen(false);
              }}
            >
              Сбросить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
