import { useState, useEffect, useRef } from "react";
import {
  useListWords,
  useUpdatePack,
  getListPacksQueryKey,
  VocabWord,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudyMode } from "@/lib/types";
import { toPinyin } from "@/lib/pinyin";

interface StudyScreenProps {
  packId: number;
  packName: string;
  packLanguage: string;
  onBack: () => void;
  onFinish: (score: number, wrongWords: VocabWord[], totalWords: number, mode: StudyMode) => void;
}

type Feedback = "correct" | "wrong" | null;

export function StudyScreen({ packId, packName, packLanguage, onBack, onFinish }: StudyScreenProps) {
  const qc = useQueryClient();
  const { data: allWords = [], isLoading } = useListWords(packId);
  const updatePack = useUpdatePack();

  const [mode, setMode] = useState<StudyMode | null>(null);
  const [queue, setQueue] = useState<VocabWord[]>([]);
  const [initialTotal, setInitialTotal] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [wrongWords, setWrongWords] = useState<VocabWord[]>([]);
  const [currentWord, setCurrentWord] = useState<VocabWord | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [score, setScore] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isChinese = packLanguage === "chinese";

  useEffect(() => {
    if (!feedback && currentWord && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentWord, feedback]);

  const handleStart = (selectedMode: StudyMode) => {
    if (allWords.length === 0) {
      toast({ title: "Bộ từ trống", description: "Hãy thêm từ trước khi học!" });
      return;
    }
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    setMode(selectedMode);
    setQueue(shuffled);
    setInitialTotal(shuffled.length);
    setCurrentWord(shuffled[0] || null);
    setScore(0);
    setAnswered(0);
    setWrongWords([]);
    setFeedback(null);
    setAnswer("");
  };

  const checkAnswer = () => {
    if (!currentWord || !answer.trim() || feedback) return;

    const correct =
      mode === "word_to_meaning"
        ? answer.trim().toLowerCase() === currentWord.meaning.toLowerCase()
        : answer.trim().toLowerCase() === currentWord.term.toLowerCase();

    setFeedback(correct ? "correct" : "wrong");
    setAnswered((a) => a + 1);

    if (correct) {
      const newScore = score + 1;
      setScore(newScore);
      updatePack.mutate(
        { packId, data: { learned: newScore } },
        { onSuccess: () => qc.invalidateQueries({ queryKey: getListPacksQueryKey() }) }
      );
      setTimeout(() => {
        setFeedback(null);
        setAnswer("");
        const newQueue = queue.slice(1);
        setQueue(newQueue);
        if (newQueue.length === 0) {
          onFinish(newScore, wrongWords, initialTotal, mode!);
        } else {
          setCurrentWord(newQueue[0]);
        }
      }, 800);
    } else {
      if (!wrongWords.find((w) => w.id === currentWord.id)) {
        setWrongWords((prev) => [...prev, currentWord]);
      }
      const newQueue = [...queue.slice(1), currentWord];
      setQueue(newQueue);
    }
  };

  const handleNextAfterWrong = () => {
    setFeedback(null);
    setAnswer("");
    setCurrentWord(queue[0] || null);
  };

  const handleFinish = () => {
    onFinish(score, wrongWords, initialTotal, mode!);
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground text-sm">Đang tải...</div>;

  if (!mode) {
    return (
      <div className="w-full max-w-xl mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3 pt-4">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">{packName}</h2>
            <p className="text-xs text-muted-foreground">{allWords.length} từ vựng</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { mode: "word_to_meaning" as StudyMode, label: isChinese ? "Từ → Nghĩa" : "Từ → Nghĩa", sub: isChinese ? "Nhìn chữ Hán, viết nghĩa" : "Nhìn từ, viết nghĩa" },
            { mode: "meaning_to_word" as StudyMode, label: isChinese ? "Nghĩa → Từ" : "Nghĩa → Từ", sub: isChinese ? "Nhìn nghĩa, viết chữ Hán" : "Nhìn nghĩa, viết từ" },
          ].map((opt) => (
            <button
              key={opt.mode}
              onClick={() => handleStart(opt.mode)}
              className="bg-card border border-border rounded-lg p-5 text-left hover:border-primary/60 hover:shadow-sm transition-all group"
              data-testid={`mode-${opt.mode}`}
            >
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{opt.sub}</p>
            </button>
          ))}
        </div>

      </div>
    );
  }

  const modeLabel = mode === "word_to_meaning" ? "Từ → Nghĩa" : "Nghĩa → Từ";
  const displayWord = mode === "word_to_meaning" ? currentWord?.term : currentWord?.meaning;
  const correctAnswer = mode === "word_to_meaning" ? currentWord?.meaning : currentWord?.term;
  const progressIndex = initialTotal - queue.length + (feedback === "correct" ? 0 : 0);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleFinish()}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="font-semibold text-foreground text-sm">{packName}</p>
            <p className="text-xs text-muted-foreground">{modeLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">Điểm: {score}</p>
          <p className="text-xs text-muted-foreground">{answered + 1}/{initialTotal}</p>
        </div>
      </div>

      {currentWord && (
        <div className={`bg-card border rounded-lg p-6 flex flex-col gap-4 transition-colors ${
          feedback === "correct" ? "border-green-400 bg-green-50/30" :
          feedback === "wrong" ? "border-red-400 bg-red-50/30" :
          "border-border"
        }`}>
          <div className="min-h-[120px] flex flex-col items-center justify-center text-center gap-2">
            {mode === "word_to_meaning" && isChinese ? (
              <>
                <span className="font-serif text-7xl font-bold text-foreground leading-none">
                  {displayWord}
                </span>
                {displayWord && (
                  <span className="text-base text-muted-foreground tracking-widest">
                    {toPinyin(displayWord)}
                  </span>
                )}
              </>
            ) : mode === "meaning_to_word" && isChinese ? (
              <>
                <span className="text-4xl font-bold text-foreground">{displayWord}</span>
                {correctAnswer && (
                  <span className="text-sm text-muted-foreground tracking-widest">
                    {toPinyin(correctAnswer)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-4xl font-bold text-foreground">{displayWord}</span>
            )}
          </div>

          {feedback === "wrong" && (
            <div className="text-sm text-red-600 text-center font-medium -mt-2">
              Sai rồi! Từ này sẽ xuất hiện lại sau.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (feedback === "wrong") handleNextAfterWrong();
                  else checkAnswer();
                }
              }}
              placeholder={
                mode === "word_to_meaning"
                  ? isChinese ? "Nhập nghĩa tiếng Việt..." : "Nhập nghĩa..."
                  : isChinese ? "Nhập chữ Hán..." : "Nhập từ tiếng Anh..."
              }
              className={`h-11 text-center text-base ${
                feedback === "correct" ? "border-green-400 focus-visible:ring-green-400" :
                feedback === "wrong" ? "border-red-400 focus-visible:ring-red-400" : ""
              }`}
              disabled={feedback === "correct"}
              data-testid="input-answer"
              autoComplete="off"
            />

            {feedback === "wrong" && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Đáp án: <span className="font-semibold text-foreground">{correctAnswer}</span>
                </p>
                {isChinese && mode === "meaning_to_word" && correctAnswer && (
                  <p className="text-xs text-muted-foreground mt-0.5 tracking-widest">
                    {toPinyin(correctAnswer)}
                  </p>
                )}
              </div>
            )}

            {feedback === "wrong" ? (
              <Button onClick={handleNextAfterWrong} variant="outline" className="w-full h-10 gap-2" data-testid="button-next-word">
                Từ tiếp theo <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={checkAnswer}
                disabled={!answer.trim() || feedback === "correct"}
                className="w-full h-10"
                data-testid="button-check"
              >
                Kiểm tra
              </Button>
            )}
          </div>
        </div>
      )}

      <Button variant="outline" onClick={handleFinish} className="w-full h-9 text-sm" data-testid="button-finish">
        Hoàn thành buổi học
      </Button>
    </div>
  );
}
