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
  selectedWords?: VocabWord[];
  onBack: () => void;
  onFinish: (score: number, wrongWords: VocabWord[], totalWords: number, mode: StudyMode) => void;
}

type Feedback = "correct" | "wrong" | null;

export function StudyScreen({ packId, packName, packLanguage, selectedWords: preselectedWords, onBack, onFinish }: StudyScreenProps) {
  const qc = useQueryClient();
  const { data: fetchedWords = [], isLoading } = useListWords(packId);
  const allWords = preselectedWords ?? fetchedWords;
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
  const advanceRef = useRef<(() => void) | null>(null);
  const correctTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const isChinese = packLanguage === "chinese";

  useEffect(() => {
    if (!feedback && currentWord && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentWord, feedback]);

  // Global Enter key handler: advances immediately regardless of delay / disabled input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement;
      // If input is active (feedback is null), let the input's own handler fire
      if (target === inputRef.current) return;
      advanceRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
    advanceRef.current = null;
  };

  const getCorrectAnswer = (word: VocabWord) => {
    if (isChinese) return word.term;
    return mode === "word_to_meaning" ? word.meaning : word.term;
  };

  const checkAnswer = () => {
    if (!currentWord || !answer.trim() || feedback) return;

    const correct = answer.trim().toLowerCase() === getCorrectAnswer(currentWord).toLowerCase();

    setFeedback(correct ? "correct" : "wrong");
    setAnswered((a) => a + 1);

    if (correct) {
      const newScore = score + 1;
      setScore(newScore);
      updatePack.mutate(
        { packId, data: { learned: newScore } },
        { onSuccess: () => qc.invalidateQueries({ queryKey: getListPacksQueryKey() }) }
      );

      const advance = () => {
        if (correctTimerRef.current) { clearTimeout(correctTimerRef.current); correctTimerRef.current = null; }
        advanceRef.current = null;
        setFeedback(null);
        setAnswer("");
        const newQueue = queue.slice(1);
        setQueue(newQueue);
        if (newQueue.length === 0) {
          onFinish(newScore, wrongWords, initialTotal, mode!);
        } else {
          setCurrentWord(newQueue[0]);
        }
      };

      advanceRef.current = advance;
      correctTimerRef.current = setTimeout(advance, 800);
    } else {
      if (!wrongWords.find((w) => w.id === currentWord.id)) {
        setWrongWords((prev) => [...prev, currentWord]);
      }
      const newQueue = [...queue.slice(1), currentWord];
      setQueue(newQueue);

      const nextAfterWrong = () => {
        advanceRef.current = null;
        setFeedback(null);
        setAnswer("");
        setCurrentWord(newQueue[0] || null);
      };
      advanceRef.current = nextAfterWrong;
    }
  };

  const handleNextAfterWrong = () => {
    advanceRef.current?.();
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
            {
              mode: "word_to_meaning" as StudyMode,
              label: isChinese ? "Chữ → Chữ Hán" : "Từ → Nghĩa",
              sub: isChinese ? "Nhìn chữ Hán, viết lại chữ Hán" : "Nhìn từ, viết nghĩa",
            },
            {
              mode: "meaning_to_word" as StudyMode,
              label: isChinese ? "Nghĩa → Chữ Hán" : "Nghĩa → Từ",
              sub: isChinese ? "Nhìn nghĩa tiếng Việt, viết chữ Hán" : "Nhìn nghĩa, viết từ",
            },
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

  const displayWord = mode === "word_to_meaning" ? currentWord?.term : currentWord?.meaning;
  const modeLabel = mode === "word_to_meaning"
    ? (isChinese ? "Chữ → Chữ Hán" : "Từ → Nghĩa")
    : (isChinese ? "Nghĩa → Chữ Hán" : "Nghĩa → Từ");

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
          {/* Question display — no pinyin here */}
          <div className="min-h-[100px] flex items-center justify-center text-center">
            {mode === "word_to_meaning" && isChinese ? (
              <span className="font-serif text-7xl font-bold text-foreground leading-none">
                {displayWord}
              </span>
            ) : (
              <span className="text-4xl font-bold text-foreground">{displayWord}</span>
            )}
          </div>

          {/* Review card shown after checking — always for Chinese */}
          {feedback && isChinese && currentWord && (
            <div className={`rounded-md px-4 py-3 flex flex-col items-center gap-1 text-center ${
              feedback === "correct" ? "bg-green-100/60" : "bg-red-50/60"
            }`}>
              <span className="font-serif text-3xl font-bold text-foreground">{currentWord.term}</span>
              <span className="text-sm text-muted-foreground tracking-widest">{toPinyin(currentWord.term)}</span>
              <span className="text-sm text-foreground font-medium">{currentWord.meaning}</span>
            </div>
          )}

          {/* Wrong feedback for non-Chinese packs */}
          {feedback === "wrong" && !isChinese && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Đáp án: <span className="font-semibold text-foreground">{currentWord.meaning}</span>
              </p>
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
                isChinese
                  ? "Nhập chữ Hán..."
                  : mode === "word_to_meaning"
                    ? "Nhập nghĩa..."
                    : "Nhập từ..."
              }
              className={`h-11 text-center text-base font-serif ${
                feedback === "correct" ? "border-green-400 focus-visible:ring-green-400" :
                feedback === "wrong" ? "border-red-400 focus-visible:ring-red-400" : ""
              }`}
              disabled={!!feedback}
              data-testid="input-answer"
              autoComplete="off"
            />

            {feedback === "wrong" ? (
              <Button onClick={handleNextAfterWrong} variant="outline" className="w-full h-10 gap-2" data-testid="button-next-word">
                Từ tiếp theo <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={checkAnswer}
                disabled={!answer.trim() || !!feedback}
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
