import { push, ref, remove, set, update } from 'firebase/database';
import { db } from '../firebase';

export interface Task {
  id?: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed';
  isDeleted?: boolean;
  deletedAt?: number;
}

const taskCollection = ref(db, 'tasks');

export const addTask = async (task: Omit<Task, 'id'>) => {
  const taskReference = push(taskCollection);
  await set(taskReference, task);
  return taskReference;
};

export const updateTask = async (id: string, updatedData: Partial<Task>) => {
  const { id: _id, ...taskData } = updatedData;
  return await update(ref(db, `tasks/${id}`), taskData);
};

export const moveTaskToTrash = async (id: string) => {
  return await update(ref(db, `tasks/${id}`), { isDeleted: true, deletedAt: Date.now() });
};

export const restoreTask = async (id: string) => {
  return await update(ref(db, `tasks/${id}`), { isDeleted: false, deletedAt: null });
};

export const permanentlyDeleteTask = async (id: string) => {
  return await remove(ref(db, `tasks/${id}`));
};