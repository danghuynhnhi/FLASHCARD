import { useState, useMemo } from "react";
import { useListWords, VocabWord } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckSquare, Square } from "lucide-react";
import { toPinyin } from "@/lib/pinyin";

interface WordSelectScreenProps {
  packId: number;
  packName: string;
  packLanguage: string;
  onBack: () => void;
  onStart: (selectedWords: VocabWord[]) => void;
}

export function WordSelectScreen({ packId, packName, packLanguage, onBack, onStart }: WordSelectScreenProps) {
  const { data: words = [], isLoading } = useListWords(packId);
  const [selectedIds, setSelectedIds] = useState<Set<number> | null>(null);

  const isChinese = packLanguage === "chinese";

  const effectiveSelected: Set<number> = useMemo(() => {
    if (selectedIds !== null) return selectedIds;
    return new Set(words.map((w) => w.id));
  }, [selectedIds, words]);

  const allSelected = effectiveSelected.size === words.length;
  const noneSelected = effectiveSelected.size === 0;

  const toggle = (id: number) => {
    const next = new Set(effectiveSelected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(words.map((w) => w.id)));
    }
  };

  const handleStart = () => {
    const chosen = words.filter((w) => effectiveSelected.has(w.id));
    if (chosen.length === 0) return;
    onStart(chosen);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3 pt-4">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Chọn từ để học</h2>
          <p className="text-xs text-muted-foreground">{packName}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-sm text-muted-foreground">
            Đã chọn <span className="font-semibold text-foreground">{effectiveSelected.size}</span> / {words.length} từ
          </span>
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            data-testid="button-toggle-all"
          >
            {allSelected
              ? <><CheckSquare className="h-4 w-4" /> Bỏ chọn tất cả</>
              : <><Square className="h-4 w-4" /> Chọn tất cả</>
            }
          </button>
        </div>

        {isLoading ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Đang tải...</p>
        ) : words.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Bộ từ chưa có từ nào</p>
        ) : (
          <ul className="divide-y divide-border max-h-[55vh] overflow-y-auto">
            {words.map((w) => {
              const checked = effectiveSelected.has(w.id);
              return (
                <li
                  key={w.id}
                  onClick={() => toggle(w.id)}
                  className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors select-none ${
                    checked ? "bg-background" : "bg-muted/30"
                  }`}
                  data-testid={`word-row-${w.id}`}
                >
                  <span className={`shrink-0 transition-colors ${checked ? "text-primary" : "text-muted-foreground/40"}`}>
                    {checked
                      ? <CheckSquare className="h-4 w-4" />
                      : <Square className="h-4 w-4" />
                    }
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold text-sm ${isChinese ? "font-serif text-base" : ""} ${checked ? "text-foreground" : "text-muted-foreground"}`}>
                      {w.term}
                    </span>
                    {isChinese && (
                      <p className="text-xs text-muted-foreground tracking-wide">{toPinyin(w.term)}</p>
                    )}
                  </div>
                  <span className={`text-sm truncate max-w-[45%] ${checked ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                    {w.meaning}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Button
        onClick={handleStart}
        disabled={noneSelected || isLoading}
        className="w-full h-11 text-base font-semibold"
        data-testid="button-start-study"
      >
        Bắt đầu học {effectiveSelected.size > 0 ? `(${effectiveSelected.size} từ)` : ""}
      </Button>
    </div>
  );
}
