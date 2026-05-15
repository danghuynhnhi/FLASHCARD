import { useState } from "react";
import { ViewState } from "@/lib/types";
import { UsersScreen } from "@/components/users-screen";
import { PacksScreen } from "@/components/packs-screen";
import { StudyScreen } from "@/components/study-screen";

function App() {
  const [viewState, setViewState] = useState<ViewState>({ view: "users" });

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col selection:bg-primary/20">
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
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
            onStudy={(packId, packName, packLanguage) =>
              setViewState({
                view: "study",
                userId: viewState.userId,
                userName: viewState.userName,
                packId,
                packName,
                packLanguage,
              })
            }
          />
        )}
        {viewState.view === "study" && (
          <StudyScreen
            packId={viewState.packId}
            packName={viewState.packName}
            packLanguage={viewState.packLanguage}
            onBack={() =>
              setViewState({
                view: "packs",
                userId: viewState.userId,
                userName: viewState.userName,
              })
            }
          />
        )}
      </main>
    </div>
  );
}

export default App;
