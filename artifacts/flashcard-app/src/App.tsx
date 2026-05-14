import React, { useState } from 'react';
import { ViewState } from '@/lib/types';
import { useFlashcards } from '@/hooks/use-flashcards';
import { UsersScreen } from '@/components/users-screen';
import { PacksScreen } from '@/components/packs-screen';
import { StudyScreen } from '@/components/study-screen';

function App() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'users' });
  const flashcardsProps = useFlashcards();

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col selection:bg-primary/20">
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {viewState.view === 'users' && (
          <UsersScreen 
            {...flashcardsProps} 
            onSelectUser={(userName) => setViewState({ view: 'packs', userName })} 
          />
        )}
        {viewState.view === 'packs' && (
          <PacksScreen 
            {...flashcardsProps} 
            userName={viewState.userName}
            onBack={() => setViewState({ view: 'users' })}
            onStudy={(packName) => setViewState({ view: 'study', userName: viewState.userName, packName })}
          />
        )}
        {viewState.view === 'study' && (
          <StudyScreen 
            {...flashcardsProps} 
            userName={viewState.userName}
            packName={viewState.packName}
            onBack={() => setViewState({ view: 'packs', userName: viewState.userName })}
          />
        )}
      </main>
    </div>
  );
}

export default App;
