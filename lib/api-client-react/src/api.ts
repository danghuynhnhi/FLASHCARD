import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { VocabWord } from "./generated/api.schemas";

export function useStarredWords(userId: number, language: string) {
  return useQuery({
    queryKey: ["starredWords", userId, language],
    queryFn: async (): Promise<VocabWord[]> => {
      return customFetch<VocabWord[]>(
        `/api/users/${userId}/starred/${language}`,
        {
          method: "GET",
        }
      );
    },
    enabled: !!userId && !!language,
  });
}