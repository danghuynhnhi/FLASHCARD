import { VocabWord } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, RotateCcw, AlertCircle } from "lucide-react";
import { toPinyin } from "@/lib/pinyin";

interface ResultsScreenProps {
  packName: string;
  packLanguage: string;
  score: number;
  wrongWords: VocabWord[];
  totalWords: number;
  onHome: () => void;
  onStudyAgain: () => void;
  onStudyWrongWords: () => void;
}

export function ResultsScreen({ packName, packLanguage, score, wrongWords, totalWords, onHome, onStudyAgain, onStudyWrongWords }: ResultsScreenProps) {
  const wrong = wrongWords.length;
  const accuracy = totalWords > 0 ? Math.round((score / totalWords) * 100) : 100;
  const progressPct = Math.min(accuracy, 100);
  const isChinese = packLanguage === "chinese";

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-5 pt-6">
      <div className="text-center">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <RotateCcw className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Kết quả buổi học</h2>
        <p className="text-sm text-muted-foreground mt-1">{packName}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-foreground">{score}</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Đúng</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{wrong}</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Sai</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-foreground">{accuracy}%</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Chính xác</p>
        </div>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {wrong === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-2">Không có từ nào sai! 🎉</p>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase px-5 pt-4 pb-2">
            Từ cần ôn lại ({wrong})
          </p>
          <ul className="divide-y divide-border max-h-52 overflow-y-auto">
            {wrongWords.map((w) => (
              <li key={w.id} className="flex justify-between items-start gap-3 px-5 py-3 text-sm">
                <div className="flex flex-col">
                  <span className={`font-medium text-foreground ${isChinese ? "font-serif text-base" : ""}`}>{w.term}</span>
                  {isChinese && <span className="text-xs text-muted-foreground tracking-wide">{toPinyin(w.term)}</span>}
                </div>
                <span className="text-muted-foreground text-right">{w.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-2">
        {wrong > 0 && (
          <Button
            onClick={onStudyWrongWords}
            variant="outline"
            className="w-full h-11 gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            data-testid="button-study-wrong"
          >
            <AlertCircle className="h-4 w-4" />
            Học lại {wrong} từ sai
          </Button>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onHome} className="flex-1 h-11 gap-2" data-testid="button-home">
            <ChevronLeft className="h-4 w-4" /> Trang chủ
          </Button>
          <Button onClick={onStudyAgain} className="flex-1 h-11 gap-2" data-testid="button-study-again">
            <RotateCcw className="h-4 w-4" /> Học lại tất cả
          </Button>
        </div>
      </div>
    </div>
  );
}
