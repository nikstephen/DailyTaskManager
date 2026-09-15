<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title class="modern-title">Daily Task Manager</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/notes">Notes</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="modern-bg">
      <main class="dashboard-shell">
        <section class="progress-card">
          <div class="progress-copy">
            <span class="eyebrow">PROGRESS OVERVIEW</span>
            <strong>{{ completedCount }} of {{ tasks.length }} tasks completed</strong>
          </div>
          <span class="progress-percent">{{ completionPercent }}%</span>
          <div class="progress-track"><span :style="{ width: `${completionPercent}%` }"></span></div>
        </section>

      <div class="feed-heading">
        <h1>{{ activeSection === 'trash' ? 'Task Trash' : 'Your Feed' }} <span>{{ visibleTasks.length }}</span></h1>
      </div>
      <ion-searchbar class="task-search" v-model="searchText" placeholder="Search tasks" show-clear-button="focus" />
      <ion-segment v-model="activeSection" class="task-segment">
        <ion-segment-button value="all">All Tasks</ion-segment-button>
        <ion-segment-button value="trash">Trash</ion-segment-button>
      </ion-segment>
      <section class="filter-panel">
        <label>Status
          <ion-select v-model="statusFilter" interface="popover" aria-label="Filter by status">
            <ion-select-option value="all">All Tasks</ion-select-option>
            <ion-select-option value="Pending">Pending</ion-select-option>
            <ion-select-option value="Completed">Completed</ion-select-option>
          </ion-select>
        </label>
        <label>Priority
          <ion-select v-model="priorityFilter" interface="popover" aria-label="Filter by priority">
            <ion-select-option value="all">All Priority</ion-select-option>
            <ion-select-option value="High">High</ion-select-option>
            <ion-select-option value="Medium">Medium</ion-select-option>
            <ion-select-option value="Low">Low</ion-select-option>
          </ion-select>
        </label>
        <label>Sort
        <ion-select v-model="sortMode" interface="popover" aria-label="Sort tasks" placeholder="Sort">
          <ion-select-option value="dueSoon">Earliest</ion-select-option>
          <ion-select-option value="dueLate">Latest</ion-select-option>
          <ion-select-option value="title">Title A-Z</ion-select-option>
          <ion-select-option value="priority">Priority</ion-select-option>
          <ion-select-option value="status">Status</ion-select-option>
        </ion-select>
        </label>
      
      </section>
      <ion-list v-if="visibleTasks.length > 0" class="modern-list">
        <TaskItem 
          v-for="task in visibleTasks"
          :key="task.id" 
          :task="task" 
          @toggle-status="handleToggleStatus"
          @delete-task="handleDelete"
          @restore-task="handleRestore"
          @permanent-delete-task="handlePermanentDelete"
          @edit-task="openEditModal" 
        />
      </ion-list>
      <div v-else class="empty-state">
        <p>{{ databaseError || (searchText ? 'No tasks match your search.' : "You're all caught up!") }}</p>
      </div>
      </main>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button aria-label="Add task" @click="openCreateModal"><ion-icon :icon="addOutline" /></ion-fab-button>
      </ion-fab>

      <!-- NEW: Edit Modal -->
      <ion-modal :is-open="isModalOpen" @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Edit Task</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeModal">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <TaskForm :existingTask="taskToEdit" @task-saved="closeModal" />
        </ion-content>
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonList, alertController, IonModal, IonButtons, IonButton, IonSearchbar, IonSelect, IonSelectOption, IonSegment, IonSegmentButton,
  IonFab, IonFabButton, IonIcon
} from '@ionic/vue';
import { addOutline } from 'ionicons/icons';
import { onValue, ref as databaseRef } from 'firebase/database';
import { db } from '../firebase';
import TaskForm from '../components/TaskForm.vue';
import TaskItem from '../components/TaskItem.vue';
import { Task, updateTask, moveTaskToTrash, restoreTask, permanentlyDeleteTask } from '../services/taskService';

const tasks = ref<Task[]>([]);
const databaseError = ref('');
const searchText = ref('');
const sortMode = ref('dueSoon');
const statusFilter = ref('all');
const priorityFilter = ref('all');
const activeSection = ref('all');

const activeTasks = computed(() => tasks.value.filter((task) => !task.isDeleted));
const completedCount = computed(() => activeTasks.value.filter((task) => task.status === 'Completed').length);
const completionPercent = computed(() => activeTasks.value.length ? Math.round((completedCount.value / activeTasks.value.length) * 100) : 0);

const visibleTasks = computed(() => {
  const query = searchText.value.trim().toLowerCase();
  return tasks.value
    .filter((task) => activeSection.value === 'trash' ? task.isDeleted : !task.isDeleted)
    .filter((task) => !query || `${task.title} ${task.description} ${task.priority} ${task.status}`.toLowerCase().includes(query))
    .filter((task) => statusFilter.value === 'all' || task.status === statusFilter.value)
    .filter((task) => priorityFilter.value === 'all' || task.priority === priorityFilter.value)
    .sort((left, right) => {
      if (sortMode.value === 'title') return left.title.localeCompare(right.title);
      if (sortMode.value === 'priority') {
        const priorityRank = { High: 0, Medium: 1, Low: 2 };
        return priorityRank[left.priority] - priorityRank[right.priority];
      }
      if (sortMode.value === 'status') return left.status.localeCompare(right.status);
      const leftDate = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDate = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return sortMode.value === 'dueLate' ? rightDate - leftDate : leftDate - rightDate;
    });
});

// NEW: Modal State
const isModalOpen = ref(false);
const taskToEdit = ref<Task | null>(null);

let unsubscribeTasks: (() => void) | undefined;

onMounted(async () => {
  unsubscribeTasks = onValue(databaseRef(db, 'tasks'), (snapshot) => {
    const taskData = snapshot.val() as Record<string, Omit<Task, 'id'>> | null;
    databaseError.value = '';
    tasks.value = taskData
      ? Object.entries(taskData).map(([id, task]) => ({ id, ...task }))
      : [];
  }, (error) => {
    databaseError.value = `Database error: ${error.message}`;
  });
});

onUnmounted(() => {
  unsubscribeTasks?.();
});

const handleToggleStatus = async (task: Task) => {
  if (!task.id) return;
  await updateTask(task.id, { status: task.status === 'Pending' ? 'Completed' : 'Pending' });
};

const handleDelete = async (id: string | undefined) => {
  if (!id) return;
  const alert = await alertController.create({
    header: 'Move to Trash?',
    message: 'You can restore this task from Trash.',
    buttons: [
      { text: 'Keep', role: 'cancel' },
      { text: 'Move to Trash', role: 'destructive', handler: async () => await moveTaskToTrash(id) }
    ]
  });
  await alert.present();
};

const handleRestore = async (id: string | undefined) => {
  if (id) await restoreTask(id);
};

const handlePermanentDelete = async (id: string | undefined) => {
  if (!id) return;
  const alert = await alertController.create({
    header: 'Delete Permanently?',
    message: 'This task cannot be restored after deletion.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Delete', role: 'destructive', handler: async () => await permanentlyDeleteTask(id) }
    ]
  });
  await alert.present();
};

// NEW: Modal Functions
const openEditModal = (task: Task) => {
  taskToEdit.value = { ...task }; // Copy the task so we don't edit live data
  isModalOpen.value = true;
};

const openCreateModal = () => {
  taskToEdit.value = null;
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  taskToEdit.value = null;
};
</script>

<style scoped>
.modern-bg { --background: #0d1118; }
.app-header ion-toolbar { --background: #101624; --color: #f5f7fb; }
.modern-title { font-size: 1rem; font-weight: 700; }
.active-pill { color: #9aa8ff; background: #22244b; border: 1px solid #3b438c; border-radius: 10px; font-size: .62rem; padding: 3px 7px; margin-left: 6px; vertical-align: middle; }
.dashboard-shell { max-width: 760px; margin: 0 auto; padding: 16px 18px 100px; }
.progress-card, .filter-panel { background: #18202b; border: 1px solid #263243; border-radius: 16px; }
.progress-card { padding: 16px 18px; margin-bottom: 18px; position: relative; }
.progress-copy { display: grid; gap: 6px; color: #e5eaf2; }.eyebrow { color: #8490a3; font-size: .62rem; letter-spacing: .08em; }.progress-percent { position: absolute; right: 18px; top: 20px; color: #4ebaff; background: #123b5b; border-radius: 9px; padding: 5px 8px; font-weight: 800; }.progress-track { height: 7px; background: #143653; border-radius: 5px; margin-top: 16px; overflow: hidden; }.progress-track span { display: block; height: 100%; background: #3b8dff; border-radius: inherit; transition: width .25s ease; }
.feed-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }.feed-heading h1 { color: #f5f7fb; font-size: 1.1rem; margin: 0; }.feed-heading h1 span { display: inline-grid; place-items: center; min-width: 20px; height: 20px; background: #2b3543; color: #c7d0dc; border-radius: 10px; font-size: .7rem; margin-left: 4px; }.task-search { width: 100%; height: 46px; --background: #18202b; --color: #eef3fb; --placeholder-color: #718096; --icon-color: #8b9ab0; --clear-button-color: #8b9ab0; --box-shadow: none; padding: 0; margin: 0 0 12px; }
.filter-panel { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 9px 10px; margin-bottom: 14px; }.filter-panel label { display: grid; gap: 4px; color: #8692a4; font-size: .58rem; font-weight: 700; }.filter-panel ion-select { --color: #dbe3ed; --padding-start: 0; --padding-end: 0; font-size: .76rem; min-width: 0; }
.modern-list { background: transparent; padding: 0; }.empty-state { text-align: center; padding: 40px; color: #8290a3; font-size: 1rem; }
@media (max-width: 420px) { .dashboard-shell { padding-inline: 12px; }.filter-panel { gap: 3px; padding-inline: 8px; } }
</style>