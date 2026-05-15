import { useState } from "react";
import {
  useCreatePack,
  useCreateWord,
  getListPacksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, X, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
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

function parseBulkText(text: string): StagedWord[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let term = "", meaning = "";
      if (line.includes("\t")) {
        [term, meaning] = line.split("\t");
      } else if (line.includes(" - ")) {
        const idx = line.indexOf(" - ");
        term = line.slice(0, idx);
        meaning = line.slice(idx + 3);
      } else if (line.includes(",")) {
        const idx = line.indexOf(",");
        term = line.slice(0, idx);
        meaning = line.slice(idx + 1);
      } else {
        term = line;
      }
      return { term: term.trim(), meaning: meaning.trim(), example: "" };
    })
    .filter((w) => w.term && w.meaning);
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
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const { toast } = useToast();

  const handleAddWord = () => {
    if (!termInput.trim() || !meaningInput.trim()) return;
    setWords((prev) => [...prev, { term: termInput.trim(), meaning: meaningInput.trim(), example: exampleInput.trim() }]);
    setTermInput("");
    setMeaningInput("");
    setExampleInput("");
  };

  const handleBulkImport = () => {
    const parsed = parseBulkText(bulkText);
    if (parsed.length === 0) {
      toast({ title: "Không tìm thấy từ hợp lệ", description: "Mỗi dòng cần có từ và nghĩa, cách nhau bằng tab, \" - \", hoặc dấu phẩy", variant: "destructive" });
      return;
    }
    setWords((prev) => [...prev, ...parsed]);
    setBulkText("");
    setShowBulk(false);
    toast({ title: `Đã thêm ${parsed.length} từ` });
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

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setShowBulk((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
          data-testid="button-toggle-bulk"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Nhập danh sách hàng loạt</span>
            <span className="text-xs text-muted-foreground">(dán từ Excel, Google Sheets...)</span>
          </div>
          {showBulk ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showBulk && (
          <div className="px-5 pb-5 flex flex-col gap-3 border-t border-border">
            <p className="text-xs text-muted-foreground pt-3">
              Mỗi dòng một từ. Phân cách bằng <strong>Tab</strong> (từ Excel/Sheets), <strong>" - "</strong>, hoặc dấu <strong>phẩy</strong>.<br />
              Ví dụ: <code className="bg-muted px-1 rounded">踢{"\t"}đá</code> hoặc <code className="bg-muted px-1 rounded">踢 - đá</code>
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"踢\tđá\n跑\tchạy\n走\tđi bộ"}
              className="w-full h-36 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="textarea-bulk"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleBulkImport}
                disabled={!bulkText.trim()}
                className="flex-1 h-9"
                data-testid="button-bulk-import"
              >
                Thêm {bulkText.trim() ? parseBulkText(bulkText).length : 0} từ vào danh sách
              </Button>
              <Button
                variant="outline"
                onClick={() => { setBulkText(""); setShowBulk(false); }}
                className="h-9 px-4"
              >
                Hủy
              </Button>
            </div>
          </div>
        )}
      </div>

      {words.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase px-5 pt-4 pb-2">
            Danh sách ({words.length} từ)
          </p>
          <ul className="divide-y divide-border max-h-64 overflow-y-auto">
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
