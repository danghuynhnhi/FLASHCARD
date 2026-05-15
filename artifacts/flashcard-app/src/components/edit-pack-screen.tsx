import { useState } from "react";
import {
  useListWords,
  useUpdatePack,
  useCreateWord,
  getListWordsQueryKey,
  getListPacksQueryKey,
  VocabWord,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, Trash2, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteWord } from "@workspace/api-client-react";

interface EditPackScreenProps {
  userId: number;
  packId: number;
  packName: string;
  packLanguage: string;
  onBack: () => void;
}

function parseBulkText(text: string): Array<{ term: string; meaning: string }> {
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
      return { term: term.trim(), meaning: meaning.trim() };
    })
    .filter((w) => w.term && w.meaning);
}

export function EditPackScreen({ userId, packId, packName: initialPackName, packLanguage, onBack }: EditPackScreenProps) {
  const qc = useQueryClient();
  const { data: words = [], isLoading } = useListWords(packId);
  const updatePack = useUpdatePack();
  const createWord = useCreateWord();

  const [name, setName] = useState(initialPackName);
  const [nameSaved, setNameSaved] = useState(true);
  const [termInput, setTermInput] = useState("");
  const [meaningInput, setMeaningInput] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const isChinese = packLanguage === "chinese";

  const invalidatePacks = () => qc.invalidateQueries({ queryKey: getListPacksQueryKey(userId) });
  const invalidateWords = () => qc.invalidateQueries({ queryKey: getListWordsQueryKey(packId) });

  const handleSaveName = () => {
    if (!name.trim() || name.trim() === initialPackName) { setNameSaved(true); return; }
    updatePack.mutate(
      { packId, data: { name: name.trim() } },
      {
        onSuccess: () => { setNameSaved(true); invalidatePacks(); toast({ title: "Đã đổi tên bộ từ" }); },
        onError: () => toast({ title: "Lỗi", description: "Không thể đổi tên", variant: "destructive" }),
      }
    );
  };

  const handleAddWord = () => {
    if (!termInput.trim() || !meaningInput.trim()) return;
    createWord.mutate(
      { packId, data: { term: termInput.trim(), meaning: meaningInput.trim() } },
      {
        onSuccess: () => {
          setTermInput(""); setMeaningInput("");
          invalidateWords(); invalidatePacks();
        },
        onError: () => toast({ title: "Lỗi", description: "Không thể thêm từ", variant: "destructive" }),
      }
    );
  };

  const handleBulkImport = async () => {
    const parsed = parseBulkText(bulkText);
    if (parsed.length === 0) {
      toast({ title: "Không tìm thấy từ hợp lệ", description: "Mỗi dòng cần có từ và nghĩa, cách nhau bằng tab, \" - \", hoặc dấu phẩy", variant: "destructive" });
      return;
    }
    setImporting(true);
    let added = 0;
    for (const w of parsed) {
      try {
        await new Promise<void>((resolve, reject) => {
          createWord.mutate(
            { packId, data: { term: w.term, meaning: w.meaning } },
            { onSuccess: () => resolve(), onError: reject }
          );
        });
        added++;
      } catch {
        // skip duplicates / errors silently
      }
    }
    invalidateWords();
    invalidatePacks();
    setBulkText("");
    setShowBulk(false);
    setImporting(false);
    toast({ title: `Đã thêm ${added} từ` });
  };

  const handleDeleteWord = async (word: VocabWord) => {
    setDeletingId(word.id);
    try {
      await deleteWord({ wordId: word.id });
      invalidateWords(); invalidatePacks();
    } catch {
      toast({ title: "Lỗi", description: "Không thể xóa từ", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const previewCount = bulkText.trim() ? parseBulkText(bulkText).length : 0;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex items-center gap-3 pt-4">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-packs">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-foreground">Chỉnh sửa bộ từ</h2>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
          Tên bộ từ vựng
        </p>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setNameSaved(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            className="flex-1 h-10"
            data-testid="input-pack-name"
          />
          <Button
            onClick={handleSaveName}
            disabled={nameSaved || updatePack.isPending}
            className="h-10 px-4"
            data-testid="button-save-name"
          >
            {updatePack.isPending ? "Đang lưu..." : "Lưu tên"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Ngôn ngữ: <span className="font-medium text-foreground">{isChinese ? "Tiếng Trung" : "Tiếng Anh"}</span>
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Thêm từ mới
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
          <Button
            onClick={handleAddWord}
            disabled={createWord.isPending}
            className="h-10 w-10 p-0 shrink-0"
            data-testid="button-add-word"
          >
            <Plus className="h-4 w-4" />
          </Button>
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
                disabled={!bulkText.trim() || importing}
                className="flex-1 h-9"
                data-testid="button-bulk-import"
              >
                {importing ? "Đang lưu..." : `Thêm ${previewCount} từ vào bộ`}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setBulkText(""); setShowBulk(false); }}
                className="h-9 px-4"
                disabled={importing}
              >
                Hủy
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase px-5 pt-4 pb-2">
          Danh sách từ {isLoading ? "" : `(${words.length} từ)`}
        </p>
        {isLoading ? (
          <p className="px-5 pb-4 text-sm text-muted-foreground">Đang tải...</p>
        ) : words.length === 0 ? (
          <p className="px-5 pb-4 text-sm text-muted-foreground">Chưa có từ nào</p>
        ) : (
          <ul className="divide-y divide-border max-h-64 overflow-y-auto">
            {words.map((w, i) => (
              <li key={w.id} className="flex items-center gap-3 px-5 py-3 text-sm group" data-testid={`word-item-${w.id}`}>
                <span className="text-muted-foreground text-xs w-5 shrink-0">{i + 1}</span>
                <span className={`font-semibold flex-1 ${isChinese ? "font-serif text-base" : ""}`}>{w.term}</span>
                <span className="text-muted-foreground flex-1">{w.meaning}</span>
                <button
                  onClick={() => handleDeleteWord(w)}
                  disabled={deletingId === w.id}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  data-testid={`button-delete-word-${w.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
