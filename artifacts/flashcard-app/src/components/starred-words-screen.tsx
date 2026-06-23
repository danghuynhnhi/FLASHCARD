import { useState } from "react";
import { useStarredWords, VocabWord } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Star } from "lucide-react";
import { toPinyin } from "@/lib/pinyin";
import { useToast } from "@/hooks/use-toast";

interface StarredWordsScreenProps {
  userId: number;
  language: string;
  title: string;
  onBack: () => void;
  onStudy: (words: VocabWord[]) => void;
}

export function StarredWordsScreen({
  userId,
  language,
  title,
  onBack,
  onStudy,
}: StarredWordsScreenProps) {
  const { data: words = [], isLoading, refetch } = useStarredWords(
    userId,
    language
  );

  const [removingId, setRemovingId] = useState<number | null>(null);
  const { toast } = useToast();

  const isChinese = language === "chinese";

  const handleRemoveStar = async (word: VocabWord) => {
    try {
      setRemovingId(word.id);

      const res = await fetch(`/api/words/${word.id}/star`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          starred: false,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      await refetch();

      toast({
        title: "Đã bỏ sao",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Lỗi",
        description: "Không thể bỏ sao từ này",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3 pt-4">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {words.length} từ đã đánh dấu sao
          </p>
        </div>
      </div>

      <Button
        className="w-full h-10"
        disabled={words.length === 0 || isLoading}
        onClick={() => onStudy(words)}
      >
        Học tất cả từ sao
      </Button>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            Đang tải...
          </p>
        ) : words.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            Chưa có từ nào được đánh dấu sao
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {words.map((word) => (
              <li
                key={word.id}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold truncate ${
                      isChinese ? "font-serif text-base" : "text-sm"
                    }`}
                  >
                    {word.term}
                  </p>

                  {isChinese && (
                    <p className="text-xs text-muted-foreground tracking-wide">
                      {word.pinyin || toPinyin(word.term)}
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground truncate">
                    {word.meaning}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-yellow-500"
                  disabled={removingId === word.id}
                  onClick={() => handleRemoveStar(word)}
                  title="Bỏ sao"
                >
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}