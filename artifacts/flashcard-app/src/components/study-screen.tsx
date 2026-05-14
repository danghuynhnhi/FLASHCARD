import React, { useState, useEffect, useRef } from 'react';
import { User, Pack, Word } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, Plus, Check, X, RefreshCw, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudyScreenProps {
  users: User[];
  userName: string;
  packName: string;
  addWord: (userName: string, packName: string, word: Word) => void;
  updateLearned: (userName: string, packName: string, learnedCount: number) => void;
  onBack: () => void;
}

type StudyMode = 'word_to_meaning' | 'meaning_to_word' | null;
type Feedback = 'correct' | 'wrong' | null;

export function StudyScreen({ users, userName, packName, addWord, updateLearned, onBack }: StudyScreenProps) {
  const user = users.find(u => u.name === userName);
  const pack = user?.packs.find(p => p.name === packName);
  
  const [mode, setMode] = useState<StudyMode>(null);
  const [queue, setQueue] = useState<Word[]>([]);
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [score, setScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [isWrongWordsOnly, setIsWrongWordsOnly] = useState(false);
  
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (mode && pack && !currentWord && queue.length === 0) {
      // Initialize study session
      const shuffled = [...pack.words].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentWord(shuffled[0] || null);
    }
  }, [mode, pack]);

  useEffect(() => {
    // Focus input when moving to a new word or clearing feedback
    if (!feedback && currentWord && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentWord, feedback]);

  if (!pack) return null;

  const isChinese = pack.language === 'chinese';

  const handleStart = (selectedMode: StudyMode) => {
    if (pack.words.length === 0) {
      toast({ title: 'Bộ từ trống', description: 'Hãy thêm từ mới trước khi học nhé!' });
      return;
    }
    setMode(selectedMode);
  };

  const checkAnswer = () => {
    if (!currentWord || !answer.trim() || feedback) return;

    let isCorrect = false;
    
    if (mode === 'word_to_meaning') {
      isCorrect = answer.trim().toLowerCase() === currentWord.meaning.toLowerCase();
    } else {
      const targetWord = isChinese ? (currentWord as any).hanzi : (currentWord as any).word;
      isCorrect = answer.trim().toLowerCase() === targetWord.toLowerCase();
    }

    setFeedback(isCorrect ? 'correct' : 'wrong');

    setTimeout(() => {
      setFeedback(null);
      setAnswer('');
      
      if (isCorrect) {
        setScore(s => s + 1);
        if (!isWrongWordsOnly) {
          updateLearned(userName, packName, score + 1);
        } else {
          // Remove from wrong words if correct in wrong words mode
          setWrongWords(prev => prev.filter(w => w !== currentWord));
        }
        
        const newQueue = queue.slice(1);
        setQueue(newQueue);
        setCurrentWord(newQueue[0] || null);
        
        if (newQueue.length === 0) {
          setShowSummary(true);
        }
      } else {
        if (!wrongWords.includes(currentWord) && !isWrongWordsOnly) {
          setWrongWords(prev => [...prev, currentWord]);
        }
        // Move to end of queue
        const newQueue = [...queue.slice(1), currentWord];
        setQueue(newQueue);
        setCurrentWord(newQueue[0] || null);
      }
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newMeaning.trim()) return;
    
    const wordObj = isChinese 
      ? { hanzi: newWord.trim(), meaning: newMeaning.trim() }
      : { word: newWord.trim(), meaning: newMeaning.trim() };
      
    addWord(userName, packName, wordObj);
    setNewWord('');
    setNewMeaning('');
    toast({ title: 'Thành công', description: 'Đã thêm từ mới' });
  };

  const startWrongWordsMode = () => {
    setIsWrongWordsOnly(true);
    setShowSummary(false);
    const shuffled = [...wrongWords].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrentWord(shuffled[0] || null);
    setScore(0);
  };

  const resetSession = () => {
    setMode(null);
    setShowSummary(false);
    setQueue([]);
    setCurrentWord(null);
    setScore(0);
    setWrongWords([]);
    setIsWrongWordsOnly(false);
  };

  const getDisplayWord = () => {
    if (!currentWord) return '';
    if (mode === 'word_to_meaning') {
      return isChinese ? (currentWord as any).hanzi : (currentWord as any).word;
    } else {
      return currentWord.meaning;
    }
  };

  const getExpectedAnswer = () => {
    if (!currentWord) return '';
    if (mode === 'word_to_meaning') {
      return currentWord.meaning;
    } else {
      return isChinese ? (currentWord as any).hanzi : (currentWord as any).word;
    }
  };

  if (!mode) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-300">
        <div className="flex items-center gap-4 py-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" data-testid="button-study-back">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">{pack.name}</h2>
            <p className="text-muted-foreground text-sm">Chọn chế độ học</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => handleStart('word_to_meaning')}
            data-testid="mode-word-to-meaning"
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-40 gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium text-lg">
                {isChinese ? "Hiện chữ Hán → viết nghĩa" : "Hiện tiếng Anh → nhập nghĩa"}
              </span>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => handleStart('meaning_to_word')}
            data-testid="mode-meaning-to-word"
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-40 gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium text-lg">
                {isChinese ? "Hiện nghĩa → viết chữ Hán" : "Hiện nghĩa → nhập tiếng Anh"}
              </span>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <h3 className="font-semibold text-lg mb-4">Thêm từ mới</h3>
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <form onSubmit={handleAddWord} className="flex flex-col sm:flex-row gap-3">
                <Input 
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder={isChinese ? "Chữ Hán..." : "Từ vựng..."}
                  className="flex-1"
                  data-testid="input-new-word"
                />
                <Input 
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  placeholder="Nghĩa..."
                  className="flex-1"
                  data-testid="input-new-meaning"
                />
                <Button type="submit" data-testid="button-add-word">
                  <Plus className="h-4 w-4 mr-2" /> Thêm
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)] animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between py-4 mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={resetSession} className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-xl font-serif font-bold text-foreground">{pack.name}</h2>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full font-medium text-sm">
          Đã đúng: {score}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {currentWord ? (
          <Card className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            feedback === 'correct' ? 'bg-green-50/50 border-green-200' : 
            feedback === 'wrong' ? 'bg-red-50/50 border-red-200' : 
            'bg-card'
          }`}>
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
              
              {feedback && (
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-bold text-lg animate-in zoom-in slide-in-from-top-4 flex items-center gap-2 ${
                  feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {feedback === 'correct' ? <><Check className="h-5 w-5" /> Đúng!</> : <><X className="h-5 w-5" /> Sai rồi!</>}
                </div>
              )}

              <div className={`transition-all duration-300 ${feedback ? 'opacity-50 scale-95 mt-12' : 'scale-100'}`}>
                {mode === 'word_to_meaning' && isChinese ? (
                  <div className="text-[5rem] md:text-[7rem] leading-none font-serif font-bold text-foreground mb-4">
                    {getDisplayWord()}
                  </div>
                ) : (
                  <div className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                    {getDisplayWord()}
                  </div>
                )}
              </div>

              {feedback === 'wrong' && (
                <div className="mt-8 text-xl font-medium animate-in fade-in slide-in-from-bottom-4">
                  Đáp án đúng: <span className="text-primary font-bold">{getExpectedAnswer()}</span>
                </div>
              )}
            </div>

            <div className="p-6 bg-muted/30 border-t border-border/50">
              <div className="flex gap-3 max-w-md mx-auto">
                <Input 
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập đáp án của bạn..."
                  className="h-14 text-lg text-center"
                  disabled={!!feedback}
                  data-testid="input-answer"
                  autoFocus
                  autoComplete="off"
                />
                <Button 
                  onClick={checkAnswer} 
                  disabled={!!feedback || !answer.trim()}
                  className="h-14 px-8 text-lg"
                  data-testid="button-check"
                >
                  Kiểm tra
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card/50">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-serif font-bold mb-4">Hoàn thành!</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-md">
              Bạn đã ôn tập xong các từ trong lượt này. Hãy xem lại kết quả nhé.
            </p>
            <Button onClick={() => setShowSummary(true)} size="lg" className="px-8 h-12 text-lg">
              Xem kết quả
            </Button>
          </Card>
        )}
        
        {queue.length > 0 && currentWord && (
          <div className="mt-6 flex justify-between items-center text-sm text-muted-foreground px-2">
            <Button variant="outline" onClick={() => setShowSummary(true)} data-testid="button-finish-early">
              Hoàn thành buổi học
            </Button>
            <span>Còn lại: {queue.length} từ</span>
          </div>
        )}
      </div>

      <Dialog open={showSummary} onOpenChange={(open) => !open && setShowSummary(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-center mb-2">Kết quả buổi học</DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-1">{score}</div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Từ đúng</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-red-500 mb-1">{wrongWords.length}</div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Từ sai</div>
              </div>
            </div>

            {wrongWords.length > 0 && (
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" /> Các từ cần ôn lại
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                  {wrongWords.map((w, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <span className="font-medium">{isChinese ? (w as any).hanzi : (w as any).word}</span>
                      <span className="text-muted-foreground">{w.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-3">
            {wrongWords.length > 0 && (
              <Button 
                onClick={startWrongWordsMode} 
                className="w-full h-12 text-base"
                variant="default"
                data-testid="button-study-wrong-only"
              >
                Chỉ học từ sai
              </Button>
            )}
            <Button 
              onClick={resetSession} 
              variant={wrongWords.length > 0 ? "outline" : "default"} 
              className="w-full h-12 text-base"
            >
              Về trang chủ bộ từ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
