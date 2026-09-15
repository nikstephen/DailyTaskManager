import { child, onValue, push, ref, remove, set, update } from 'firebase/database';
import { db } from '../firebase';

export interface Note {
  id?: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  isFavorite: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export type NoteDraft = Pick<Note, 'title' | 'content' | 'color' | 'isFavorite' | 'isPinned'>;

const notesPath = () => ref(db, 'notes');

export const subscribeToNotes = async (onNotes: (notes: Note[]) => void) => {
  const notesReference = notesPath();
  return onValue(notesReference, (snapshot) => {
    const data = snapshot.val() as Record<string, Omit<Note, 'id'>> | null;
    onNotes(data ? Object.entries(data).map(([id, note]) => ({ id, ...note })) : []);
  });
};

export const createNote = async (draft: NoteDraft) => {
  const notesReference = notesPath();
  const noteReference = push(notesReference);
  const now = Date.now();
  await set(noteReference, {
    ...draft,
    title: draft.title.trim() || 'Untitled Note',
    userId: 'local-user',
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  });
};

export const updateNote = async (id: string, changes: Partial<NoteDraft>) => {
  const notesReference = notesPath();
  await update(child(notesReference, id), { ...changes, updatedAt: Date.now() });
};

export const moveNoteToTrash = async (id: string) => {
  const notesReference = notesPath();
  await update(child(notesReference, id), { isDeleted: true, deletedAt: Date.now(), updatedAt: Date.now() });
};

export const restoreNote = async (id: string) => {
  const notesReference = notesPath();
  await update(child(notesReference, id), { isDeleted: false, deletedAt: null, updatedAt: Date.now() });
};

export const permanentlyDeleteNote = async (id: string) => {
  const notesReference = notesPath();
  await remove(child(notesReference, id));
};
