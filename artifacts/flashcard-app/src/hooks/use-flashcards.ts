import { useState, useEffect, useCallback } from 'react';
import { User, INITIAL_DATA, Pack, Word } from '@/lib/types';

export function useFlashcards() {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const item = window.localStorage.getItem('flashcardData');
      return item ? JSON.parse(item) : INITIAL_DATA;
    } catch (error) {
      console.warn("Error reading localStorage", error);
      return INITIAL_DATA;
    }
  });

  const saveUsers = useCallback((newUsers: User[]) => {
    setUsers(newUsers);
    try {
      window.localStorage.setItem('flashcardData', JSON.stringify(newUsers));
    } catch (error) {
      console.warn("Error setting localStorage", error);
    }
  }, []);

  const createUser = (name: string) => {
    if (!name.trim()) return false;
    if (users.some(u => u.name === name)) return false;
    saveUsers([...users, { name, packs: [] }]);
    return true;
  };

  const renameUser = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return false;
    if (users.some(u => u.name === newName)) return false;
    saveUsers(users.map(u => u.name === oldName ? { ...u, name: newName } : u));
    return true;
  };

  const deleteUser = (name: string) => {
    saveUsers(users.filter(u => u.name !== name));
  };

  const createPack = (userName: string, packName: string, language: "chinese" | "english") => {
    if (!packName.trim()) return false;
    const user = users.find(u => u.name === userName);
    if (!user) return false;
    if (user.packs.some(p => p.name === packName)) return false;
    
    saveUsers(users.map(u => 
      u.name === userName 
        ? { ...u, packs: [...u.packs, { name: packName, language, learned: 0, words: [] }] } 
        : u
    ));
    return true;
  };

  const renamePack = (userName: string, oldPackName: string, newPackName: string) => {
    if (!newPackName.trim() || oldPackName === newPackName) return false;
    const user = users.find(u => u.name === userName);
    if (!user) return false;
    if (user.packs.some(p => p.name === newPackName)) return false;

    saveUsers(users.map(u => 
      u.name === userName 
        ? { 
            ...u, 
            packs: u.packs.map(p => p.name === oldPackName ? { ...p, name: newPackName } : p)
          } 
        : u
    ));
    return true;
  };

  const deletePack = (userName: string, packName: string) => {
    saveUsers(users.map(u => 
      u.name === userName 
        ? { ...u, packs: u.packs.filter(p => p.name !== packName) } 
        : u
    ));
  };

  const addWord = (userName: string, packName: string, word: Word) => {
    saveUsers(users.map(u => 
      u.name === userName 
        ? {
            ...u,
            packs: u.packs.map(p => 
              p.name === packName 
                ? { ...p, words: [...p.words, word] }
                : p
            )
          }
        : u
    ));
  };

  const updateLearned = (userName: string, packName: string, learnedCount: number) => {
    saveUsers(users.map(u => 
      u.name === userName 
        ? {
            ...u,
            packs: u.packs.map(p => 
              p.name === packName 
                ? { ...p, learned: Math.max(p.learned, learnedCount) } // Only increase
                : p
            )
          }
        : u
    ));
  };

  return {
    users,
    createUser,
    renameUser,
    deleteUser,
    createPack,
    renamePack,
    deletePack,
    addWord,
    updateLearned
  };
}