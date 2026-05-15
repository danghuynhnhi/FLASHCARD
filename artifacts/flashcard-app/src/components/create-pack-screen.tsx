import { useState } from "react";
import {
  useCreatePack,
  useCreateWord,
  getListPacksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StagedWord {
  term: string;
  meaning: string;
  example: string;
}

interface CreatePackScreenProps {
  userId: number;
  userName: string;
  onBack: () => void;
  onSaved: () => void;
}

export function CreatePackScreen({ userId, onBack, onSaved }: CreatePackScreenProps) {
  const qc = useQueryClient();
  const createPack = useCreatePack();
  const createWord = useCreateWord();

  const [packName, setPackName] = useState("");
  const [language, setLanguage] = useState<"chinese" | "english">("chinese");
  const [words, setWords] = useState<StagedWord[]>([]);
  const [termInput, setTermInput] = useState("");
  const [meaningInput, setMeaningInput] = useState("");
  const [exampleInput, setExampleInput] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleAddWord = () => {
    if (!termInput.trim() || !meaningInput.trim()) return;
    setWords((prev) => [...prev, { term: termInput.trim(), meaning: meaningInput.trim(), example: exampleInput.trim() }]);
    setTermInput("");
    setMeaningInput("");
    setExampleInput("");
  };

  const handleRemoveWord = (index: number) => {
    setWords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!packName.trim()) {
      toast({ title: "Lỗi", description: "Nhập tên bộ từ", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const pack = await new Promise<{ id: number }>((resolve, reject) => {
        createPack.mutate(
          { userId, data: { name: packName.trim(), language } },
          { onSuccess: (data) => resolve(data), onError: reject }
        );
      });
      for (const w of words) {
        await new Promise<void>((resolve, reject) => {
          createWord.mutate(
            { packId: pack.id, data: { term: w.term, meaning: w.meaning } },
            { onSuccess: () => resolve(), onError: reject }
          );
        });
      }
      qc.invalidateQueries({ queryKey: getListPacksQueryKey(userId) });
      toast({ title: `Đã lưu bộ từ "${packName}" với ${words.length} từ` });
      onSaved();
    } catch {
      toast({ title: "Lỗi", description: "Không thể lưu bộ từ", variant: "destructive" });
      setSaving(false);
    }
  };

  const isChinese = language === "chinese";

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex items-center gap-3 pt-4">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-packs">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-foreground">Tạo bộ từ vựng mới</h2>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
            Tên bộ từ vựng
          </p>
          <Input
            value={packName}
            onChange={(e) => setPackName(e.target.value)}
            placeholder="Nhập tên bộ từ..."
            className="h-10"
            data-testid="input-pack-name"
          />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
            Ngôn ngữ
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage("chinese")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                language === "chinese"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
              data-testid="button-lang-chinese"
            >
              Tiếng Trung
            </button>
            <button
              onClick={() => setLanguage("english")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                language === "english"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
              data-testid="button-lang-english"
            >
              Tiếng Anh
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
            Thêm từ vựng
          </p>
          <div className="flex gap-2">
            <Input
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              placeholder={isChinese ? "Chữ Hán..." : "Từ tiếng Anh..."}
              className="flex-1 h-10"
              data-testid="input-word-term"
              onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
            />
            <Input
              value={meaningInput}
              onChange={(e) => setMeaningInput(e.target.value)}
              placeholder="Nghĩa tiếng Việt..."
              className="flex-1 h-10"
              data-testid="input-word-meaning"
              onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
            />
            <Input
              value={exampleInput}
              onChange={(e) => setExampleInput(e.target.value)}
              placeholder="Câu ví dụ (tùy chọn)..."
              className="flex-[1.5] h-10 hidden sm:block"
              data-testid="input-word-example"
              onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
            />
            <Button
              type="button"
              onClick={handleAddWord}
              className="h-10 w-10 p-0 shrink-0"
              data-testid="button-add-word"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {words.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase px-5 pt-4 pb-2">
            Danh sách ({words.length} từ)
          </p>
          <ul className="divide-y divide-border">
            {words.map((w, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3 text-sm group" data-testid={`word-item-${i}`}>
                <span className="text-muted-foreground text-xs w-5 shrink-0">{i + 1}</span>
                <span className={`font-semibold ${isChinese ? "font-serif text-base" : ""}`}>{w.term}</span>
                <span className="text-muted-foreground flex-1">{w.meaning}</span>
                {w.example && <span className="text-muted-foreground text-xs italic hidden sm:block">{w.example}</span>}
                <button
                  onClick={() => handleRemoveWord(i)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  data-testid={`button-remove-word-${i}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || !packName.trim()}
        className="w-full h-11 text-base mt-2"
        data-testid="button-save-pack"
      >
        {saving ? "Đang lưu..." : `Lưu bộ từ vựng (${words.length} từ)`}
      </Button>
    </div>
  );
}
