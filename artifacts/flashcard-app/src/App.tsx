import { useState } from "react";
import { ViewState, StudyMode } from "@/lib/types";
import { VocabWord } from "@workspace/api-client-react";
import { UsersScreen } from "@/components/users-screen";
import { PacksScreen } from "@/components/packs-screen";
import { CreatePackScreen } from "@/components/create-pack-screen";
import { EditPackScreen } from "@/components/edit-pack-screen";
import { WordSelectScreen } from "@/components/word-select-screen";
import { StudyScreen } from "@/components/study-screen";
import { ResultsScreen } from "@/components/results-screen";

function App() {
  const [viewState, setViewState] = useState<ViewState>({ view: "users" });

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col">
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {viewState.view === "users" && (
          <UsersScreen
            onSelectUser={(userId, userName) =>
              setViewState({ view: "packs", userId, userName })
            }
          />
        )}
        {viewState.view === "packs" && (
          <PacksScreen
            userId={viewState.userId}
            userName={viewState.userName}
            onBack={() => setViewState({ view: "users" })}
            onCreatePack={() =>
              setViewState({ view: "create-pack", userId: viewState.userId, userName: viewState.userName })
            }
            onEditPack={(packId, packName, packLanguage) =>
              setViewState({ view: "edit-pack", userId: viewState.userId, userName: viewState.userName, packId, packName, packLanguage })
            }
            onStudy={(packId, packName, packLanguage) =>
              setViewState({
                view: "word-select",
                userId: viewState.userId,
                userName: viewState.userName,
                packId,
                packName,
                packLanguage,
              })
            }
          />
        )}
        {viewState.view === "create-pack" && (
          <CreatePackScreen
            userId={viewState.userId}
            userName={viewState.userName}
            onBack={() =>
              setViewState({ view: "packs", userId: viewState.userId, userName: viewState.userName })
            }
            onSaved={() =>
              setViewState({ view: "packs", userId: viewState.userId, userName: viewState.userName })
            }
          />
        )}
        {viewState.view === "edit-pack" && (
          <EditPackScreen
            userId={viewState.userId}
            packId={viewState.packId}
            packName={viewState.packName}
            packLanguage={viewState.packLanguage}
            onBack={() =>
              setViewState({ view: "packs", userId: viewState.userId, userName: viewState.userName })
            }
          />
        )}
        {viewState.view === "word-select" && (
          <WordSelectScreen
            packId={viewState.packId}
            packName={viewState.packName}
            packLanguage={viewState.packLanguage}
            onBack={() =>
              setViewState({ view: "packs", userId: viewState.userId, userName: viewState.userName })
            }
            onStart={(selectedWords) =>
              setViewState({
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
        {viewState.view === "study" && (
          <StudyScreen
            packId={viewState.packId}
            packName={viewState.packName}
            packLanguage={viewState.packLanguage}
            selectedWords={viewState.selectedWords}
            onBack={() =>
              setViewState({
                view: "word-select",
                userId: viewState.userId,
                userName: viewState.userName,
                packId: viewState.packId,
                packName: viewState.packName,
                packLanguage: viewState.packLanguage,
              })
            }
            onFinish={(score, wrongWords, totalWords, mode) =>
              setViewState({
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
              setViewState({ view: "packs", userId: viewState.userId, userName: viewState.userName })
            }
            onStudyAgain={() =>
              setViewState({
                view: "word-select",
                userId: viewState.userId,
                userName: viewState.userName,
                packId: viewState.packId,
                packName: viewState.packName,
                packLanguage: viewState.packLanguage,
              })
            }
            onStudyWrongWords={() =>
              setViewState({
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
