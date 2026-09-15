<template>
  <ion-item class="task-card" :class="{ completed: task.status === 'Completed', [`priority-${task.priority.toLowerCase()}`]: true }">
    <ion-checkbox slot="start" :checked="task.status === 'Completed'" @ionChange="$emit('toggle-status', task)"></ion-checkbox>
    <ion-label :class="{ 'completed-text': task.status === 'Completed' }">
      <div class="task-title-row"><h2>{{ task.title }}</h2><ion-badge :color="priorityColor">{{ task.priority }}</ion-badge></div>
      <p class="task-description">{{ task.description }}</p>
      <div class="task-meta"><span>Due {{ formatDueDate(task.dueDate) }}</span><ion-badge v-if="isDueSoon" class="due-badge">{{ dueLabel }}</ion-badge></div>
    </ion-label>
    <div class="task-actions">
      <template v-if="!task.isDeleted">
        <ion-button fill="clear" color="primary" aria-label="Edit task" @click="$emit('edit-task', task)"><ion-icon :icon="createIcon" slot="icon-only"></ion-icon></ion-button>
        <ion-button fill="clear" color="primary" aria-label="Move task to trash" @click="$emit('delete-task', task.id)"><ion-icon :icon="trashIcon" slot="icon-only"></ion-icon></ion-button>
      </template>
      <template v-else>
        <ion-button fill="clear" color="primary" aria-label="Restore task" @click="$emit('restore-task', task.id)">Restore</ion-button>
        <ion-button fill="clear" color="danger" aria-label="Permanently delete task" @click="$emit('permanent-delete-task', task.id)"><ion-icon :icon="trashIcon" slot="icon-only"></ion-icon></ion-button>
      </template>
    </div>
  </ion-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonItem, IonLabel, IonCheckbox, IonBadge, IonButton, IonIcon } from '@ionic/vue';
import { trash as trashIcon, create as createIcon } from 'ionicons/icons'; // Import create icon
import { Task } from '../services/taskService';

const props = defineProps<{ task: Task }>();

defineEmits<{
  (e: 'toggle-status', task: Task): void;
  (e: 'delete-task', id: string | undefined): void;
  (e: 'edit-task', task: Task): void;
  (e: 'restore-task', id: string | undefined): void;
  (e: 'permanent-delete-task', id: string | undefined): void;
}>();

const priorityColor = computed(() => {
  switch (props.task.priority) {
    case 'High': return 'danger';
    case 'Medium': return 'warning';
    case 'Low': return 'success';
    default: return 'primary';
  }
});

const dueDateValue = computed(() => props.task.dueDate ? new Date(`${props.task.dueDate}T00:00:00`) : null);
const isDueSoon = computed(() => {
  if (!dueDateValue.value) return false;
  const difference = dueDateValue.value.getTime() - new Date().setHours(0, 0, 0, 0);
  return difference >= 0 && difference <= 24 * 60 * 60 * 1000;
});
const dueLabel = computed(() => dueDateValue.value && dueDateValue.value.toDateString() === new Date().toDateString() ? 'Due Today' : 'Tomorrow');
const formatDueDate = (value: string) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(`${value}T12:00:00`)) : 'No date';
</script>

<style scoped>
.task-card { --background: #18202b; --border-radius: 14px; --padding-start: 12px; --inner-padding-end: 8px; margin: 0 0 12px; border-left: 4px solid #f2aa00; box-shadow: 0 5px 14px rgba(0, 0, 0, .2); }
.task-card.priority-high { border-left-color: #ff3f4d; }.task-card.priority-low { border-left-color: #38b97d; }.task-card.completed { opacity: .65; }
.task-card ion-checkbox { --size: 20px; --border-color: #9aa6b5; --checkbox-background-checked: #398fff; margin-right: 10px; }
.task-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.task-title-row h2 { color: #e9eef7; font-size: .92rem; font-weight: 750; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.task-title-row ion-badge { flex: 0 0 auto; font-size: .58rem; --padding-start: 8px; --padding-end: 8px; }
.task-description { color: #9aa7b8; font-size: .76rem; margin: 6px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.task-meta { display: flex; align-items: center; gap: 8px; color: #768396; font-size: .66rem; }.due-badge { --background: #ffd326; --color: #211b00; font-size: .58rem; }
.task-actions { display: flex; }.task-actions ion-button { --padding-start: 5px; --padding-end: 5px; font-size: 16px; }
.completed-text h2, .completed-text p { text-decoration: line-through; }
</style>