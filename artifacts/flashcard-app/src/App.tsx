import { useEffect, useState } from "react";
import { ViewState } from "@/lib/types";
import { UsersScreen } from "@/components/users-screen";
import { PacksScreen } from "@/components/packs-screen";
import { CreatePackScreen } from "@/components/create-pack-screen";
import { EditPackScreen } from "@/components/edit-pack-screen";
import { WordSelectScreen } from "@/components/word-select-screen";
import { StudyScreen } from "@/components/study-screen";
import { ResultsScreen } from "@/components/results-screen";
import { StarredWordsScreen } from "@/components/starred-words-screen";

function App() {
  const [viewState, setViewState] = useState<ViewState>({ view: "users" });

  const navigate = (state: ViewState) => {
    window.history.pushState(state, "", window.location.href);
    setViewState(state);
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setViewState({ view: "users" });
    }
  };

  useEffect(() => {
    window.history.replaceState({ view: "users" }, "", window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as ViewState | null;
      setViewState(state && state.view ? state : { view: "users" });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col">
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {viewState.view === "users" && (
          <UsersScreen
            onSelectUser={(userId, userName) =>
              navigate({ view: "packs", userId, userName })
            }
          />
        )}

        {viewState.view === "packs" && (
          <PacksScreen
            userId={viewState.userId}
            userName={viewState.userName}
            onBack={goBack}
            onCreatePack={() =>
              navigate({
                view: "create-pack",
                userId: viewState.userId,
                userName: viewState.userName,
              })
            }
            onEditPack={(packId, packName, packLanguage) =>
              navigate({
                view: "edit-pack",
                userId: viewState.userId,
                userName: viewState.userName,
                packId,
                packName,
                packLanguage,
              })
            }
            onStudy={(packId, packName, packLanguage) => {
              const isStarredPack = packId === -100 || packId === -101;
              const isEditStarred = packId === -200 || packId === -201;

              if (isEditStarred) {
                navigate({
                  view: "starred-words",
                  userId: viewState.userId,
                  userName: viewState.userName,
                  language: packLanguage,
                  title: packName,
                });
                return;
              }

              navigate({
                view: isStarredPack ? "study" : "word-select",
                userId: viewState.userId,
                userName: viewState.userName,
                packId,
                packName,
                packLanguage,
              });
            }}
          />
        )}

        {viewState.view === "create-pack" && (
          <CreatePackScreen
            userId={viewState.userId}
            userName={viewState.userName}
            onBack={goBack}
            onSaved={() =>
              navigate({
                view: "packs",
                userId: viewState.userId,
                userName: viewState.userName,
              })
            }
          />
        )}

        {viewState.view === "edit-pack" && (
          <EditPackScreen
            userId={viewState.userId}
            packId={viewState.packId}
            packName={viewState.packName}
            packLanguage={viewState.packLanguage}
            onBack={goBack}
          />
        )}

        {viewState.view === "word-select" && (
          <WordSelectScreen
            packId={viewState.packId}
            packName={viewState.packName}
            packLanguage={viewState.packLanguage}
            onBack={goBack}
            onStart={(selectedWords) =>
              navigate({
                view: "study",
                userId: viewState.userId,
                userName: viewState.userName,
                packId: viewState.packId,
                packName: viewState.packName,
                packLanguage: viewState.packLanguage,
                selectedWords,
              })
            }
          />
        )}

        {viewState.view === "starred-words" && (
          <StarredWordsScreen
            userId={viewState.userId}
            language={viewState.language}
            title={viewState.title}
            onBack={goBack}
            onStudy={(words) =>
              navigate({
                view: "study",
                userId: viewState.userId,
                userName: viewState.userName,
                packId: viewState.language === "chinese" ? -100 : -101,
                packName: viewState.title,
                packLanguage: viewState.language,
                selectedWords: words,
              })
            }
          />
        )}

        {viewState.view === "study" && (
          <StudyScreen
            userId={viewState.userId}
            packId={viewState.packId}
            packName={viewState.packName}
            packLanguage={viewState.packLanguage}
            selectedWords={viewState.selectedWords}
            onBack={goBack}
            onFinish={(score, wrongWords, totalWords, mode) =>
              navigate({
                view: "results",
                userId: viewState.userId,
                userName: viewState.userName,
                packId: viewState.packId,
                packName: viewState.packName,
                packLanguage: viewState.packLanguage,
                score,
                wrongWords,
                totalWords,
                mode,
              })
            }
          />
        )}

        {viewState.view === "results" && (
          <ResultsScreen
            packName={viewState.packName}
            packLanguage={viewState.packLanguage}
            score={viewState.score}
            wrongWords={viewState.wrongWords}
            totalWords={viewState.totalWords}
            onHome={() =>
              navigate({
                view: "packs",
                userId: viewState.userId,
                userName: viewState.userName,
              })
            }
            onStudyAgain={() =>
              navigate({
                view: "word-select",
                userId: viewState.userId,
                userName: viewState.userName,
                packId: viewState.packId,
                packName: viewState.packName,
                packLanguage: viewState.packLanguage,
              })
            }
            onStudyWrongWords={() =>
              navigate({
                view: "study",
                userId: viewState.userId,
                userName: viewState.userName,
                packId: viewState.packId,
                packName: viewState.packName,
                packLanguage: viewState.packLanguage,
                selectedWords: viewState.wrongWords,
              })
            }
          />
        )}
      </main>
    </div>
  );
}

export default App;