<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>Notes</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="selectionMode = !selectionMode" :aria-label="selectionMode ? 'Cancel selection' : 'Select notes'">
            <ion-icon :icon="selectionMode ? closeOutline : checkmarkCircleOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar v-model="searchText" placeholder="Search notes" :clear-icon="closeCircleOutline" />
      </ion-toolbar>
    </ion-header>

    <ion-content class="notes-background">
      <div class="notes-shell">
        <div class="notes-heading">
          <div>
            <p class="eyebrow">YOUR SPACE</p>
            <h1>{{ activeSection === 'trash' ? 'Recently Deleted' : 'Notes' }}</h1>
          </div>
          <ion-button fill="clear" @click="showSortOptions">
            <ion-icon :icon="funnelOutline" slot="icon-only" />
          </ion-button>
        </div>

        <ion-segment v-model="activeSection" class="section-segment">
          <ion-segment-button value="all">All Notes</ion-segment-button>
          <ion-segment-button value="favorites">Favorites</ion-segment-button>
          <ion-segment-button value="trash">Trash</ion-segment-button>
        </ion-segment>

        <div class="view-tools">
          <span>{{ visibleNotes.length }} {{ visibleNotes.length === 1 ? 'note' : 'notes' }}</span>
          <ion-segment v-model="viewMode" class="view-segment">
            <ion-segment-button value="list"><ion-icon :icon="listOutline" slot="icon-only" /></ion-segment-button>
            <ion-segment-button value="card"><ion-icon :icon="albumsOutline" slot="icon-only" /></ion-segment-button>
            <ion-segment-button value="grid"><ion-icon :icon="gridOutline" slot="icon-only" /></ion-segment-button>
          </ion-segment>
        </div>

        <div v-if="selectionMode" class="selection-bar">
          <span>{{ selectedIds.size }} selected</span>
          <ion-button size="small" fill="clear" @click="selectAll">Select all</ion-button>
          <ion-button size="small" color="danger" fill="clear" @click="batchTrash">Delete</ion-button>
        </div>

        <div v-if="loading" class="empty-state"><ion-spinner name="crescent" /></div>
        <div v-else-if="!visibleNotes.length" class="empty-state">
          <ion-icon :icon="activeSection === 'trash' ? trashOutline : documentTextOutline" />
          <h2>{{ searchText ? 'No notes found' : activeSection === 'trash' ? 'Trash is empty' : activeSection === 'favorites' ? 'No favorite notes' : 'No notes yet' }}</h2>
          <p>{{ searchText ? 'Try a different search.' : activeSection === 'trash' ? 'Deleted notes will appear here.' : 'Create your first note to get started.' }}</p>
          <ion-button v-if="activeSection === 'all'" @click="openEditor()">New Note</ion-button>
        </div>

        <div v-else :class="['notes-layout', `layout-${viewMode}`]">
          <ion-card v-for="note in visibleNotes" :key="note.id" :class="['note-card', `note-${note.color}`]" @click="selectionMode ? toggleSelection(note.id!) : openEditor(note)">
            <ion-card-content>
              <div class="note-card-top">
                <ion-checkbox v-if="selectionMode" :checked="selectedIds.has(note.id!)" @click.stop @ionChange="toggleSelection(note.id!)" />
                <span class="note-title">{{ note.title }}</span>
                <span class="note-icons">
                  <ion-icon v-if="note.isPinned" :icon="pin" />
                  <ion-icon v-if="note.isFavorite" :icon="star" />
                </span>
              </div>
              <p class="note-preview">{{ preview(note.content) }}</p>
              <div class="note-card-bottom">
                <small>{{ formatDate(note.updatedAt) }}</small>
                <ion-button v-if="!selectionMode" fill="clear" size="small" @click.stop="showNoteOptions(note)">
                  <ion-icon :icon="ellipsisHorizontal" slot="icon-only" />
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <ion-fab v-if="!selectionMode && activeSection === 'all'" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="openEditor()"><ion-icon :icon="addOutline" /></ion-fab-button>
      </ion-fab>
    </ion-content>

    <ion-modal :is-open="editorOpen" @didDismiss="editorOpen = false">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start"><ion-button @click="editorOpen = false">Cancel</ion-button></ion-buttons>
          <ion-title>{{ editingNote ? 'Edit Note' : 'New Note' }}</ion-title>
          <ion-buttons slot="end"><ion-button strong @click="saveEditor">Save</ion-button></ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding editor-content">
        <ion-input v-model="editor.title" label="Title" label-placement="floating" fill="outline" class="editor-title" />
        <ion-textarea v-model="editor.content" label="Start writing..." label-placement="floating" fill="outline" :auto-grow="true" :rows="12" />
        <p class="editor-label">Note color</p>
        <div class="color-picker">
          <button v-for="color in colors" :key="color" :class="['color-dot', `dot-${color}`, { selected: editor.color === color }]" @click="editor.color = color" :aria-label="`Use ${color} color`" />
        </div>
        <div class="editor-toggles">
          <ion-toggle v-model="editor.isFavorite">Favorite</ion-toggle>
          <ion-toggle v-model="editor.isPinned">Pin note</ion-toggle>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton,
  IonIcon, IonSearchbar, IonSegment, IonSegmentButton, IonCard, IonCardContent, IonFab,
  IonFabButton, IonModal, IonInput, IonTextarea, IonToggle, IonCheckbox, IonSpinner,
  actionSheetController, toastController
} from '@ionic/vue';
import {
  addOutline, albumsOutline, checkmarkCircleOutline, closeCircleOutline, closeOutline,
  documentTextOutline, ellipsisHorizontal, funnelOutline, gridOutline, listOutline,
  pin, star, trashOutline
} from 'ionicons/icons';
import { Note, createNote, moveNoteToTrash, permanentlyDeleteNote, restoreNote, subscribeToNotes, updateNote } from '../services/noteService';

const notes = ref<Note[]>([]);
const loading = ref(true);
const searchText = ref('');
const activeSection = ref<'all' | 'favorites' | 'trash'>('all');
const viewMode = ref(localStorage.getItem('notes-view-mode') || 'card');
const sortMode = ref('updated');
const selectionMode = ref(false);
const selectedIds = ref(new Set<string>());
const editorOpen = ref(false);
const editingNote = ref<Note | null>(null);
const colors = ['plain', 'sun', 'mint', 'sky', 'rose'];
const editor = ref({ title: '', content: '', color: 'plain', isFavorite: false, isPinned: false });
let unsubscribe: (() => void) | undefined;

watch(viewMode, (value) => localStorage.setItem('notes-view-mode', value));

const visibleNotes = computed(() => {
  const query = searchText.value.trim().toLowerCase();
  return notes.value
    .filter((note) => activeSection.value === 'trash' ? note.isDeleted : !note.isDeleted)
    .filter((note) => activeSection.value !== 'favorites' || note.isFavorite)
    .filter((note) => !query || `${note.title} ${note.content}`.toLowerCase().includes(query))
    .sort((left, right) => {
      if (sortMode.value === 'title') return left.title.localeCompare(right.title);
      if (sortMode.value === 'created') return right.createdAt - left.createdAt;
      if (sortMode.value === 'oldest') return left.updatedAt - right.updatedAt;
      return Number(right.isPinned) - Number(left.isPinned) || right.updatedAt - left.updatedAt;
    });
});

onMounted(async () => {
  unsubscribe = await subscribeToNotes((value) => {
    notes.value = value;
    loading.value = false;
  });
});

onUnmounted(() => unsubscribe?.());

const preview = (content: string) => content.length > 120 ? `${content.slice(0, 120).trim()}...` : content || 'No content';
const formatDate = (value: number) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(value);

const openEditor = (note?: Note) => {
  editingNote.value = note || null;
  editor.value = note ? { title: note.title, content: note.content, color: note.color, isFavorite: note.isFavorite, isPinned: note.isPinned } : { title: '', content: '', color: 'plain', isFavorite: false, isPinned: false };
  editorOpen.value = true;
};

const saveEditor = async () => {
  try {
    if (editingNote.value?.id) await updateNote(editingNote.value.id, editor.value);
    else await createNote(editor.value);
    editorOpen.value = false;
    await showToast(editingNote.value ? 'Note updated' : 'Note saved');
  } catch { await showToast('Could not save note'); }
};

const showNoteOptions = async (note: Note) => {
  const sheet = await actionSheetController.create({
    header: note.title,
    buttons: [
      ...(note.isDeleted ? [
        { text: 'Restore', handler: () => restoreNote(note.id!) },
        { text: 'Permanently delete', role: 'destructive' as const, handler: () => permanentlyDeleteNote(note.id!) }
      ] : [
        { text: note.isPinned ? 'Unpin' : 'Pin', handler: () => updateNote(note.id!, { isPinned: !note.isPinned }) },
        { text: note.isFavorite ? 'Remove favorite' : 'Add to favorites', handler: () => updateNote(note.id!, { isFavorite: !note.isFavorite }) },
        { text: 'Delete', role: 'destructive' as const, handler: () => moveNoteToTrash(note.id!) }
      ]),
      { text: 'Cancel', role: 'cancel' }
    ]
  });
  await sheet.present();
};

const showSortOptions = async () => {
  const sheet = await actionSheetController.create({
    header: 'Sort notes',
    buttons: [
      { text: 'Recently updated', handler: () => { sortMode.value = 'updated'; } },
      { text: 'Recently created', handler: () => { sortMode.value = 'created'; } },
      { text: 'Oldest first', handler: () => { sortMode.value = 'oldest'; } },
      { text: 'Title A-Z', handler: () => { sortMode.value = 'title'; } },
      { text: 'Cancel', role: 'cancel' }
    ]
  });
  await sheet.present();
};

const toggleSelection = (id: string) => selectedIds.value.has(id) ? selectedIds.value.delete(id) : selectedIds.value.add(id);
const selectAll = () => selectedIds.value = new Set(visibleNotes.value.map((note) => note.id!));
const batchTrash = async () => { await Promise.all([...selectedIds.value].map((id) => moveNoteToTrash(id))); selectedIds.value.clear(); selectionMode.value = false; };

const showToast = async (message: string) => {
  const toast = await toastController.create({ message, duration: 1800, position: 'bottom' });
  await toast.present();
};

</script>

<style scoped>
.notes-background { --background: var(--ion-background-color); }
.notes-shell { max-width: 1100px; margin: 0 auto; padding: 24px 18px 110px; }
.notes-heading, .view-tools, .note-card-top, .note-card-bottom, .selection-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.eyebrow { color: var(--ion-color-primary); font-size: .72rem; font-weight: 800; letter-spacing: .12em; margin: 0 0 4px; }
h1 { font-size: 2rem; margin: 0 0 18px; }
.section-segment { margin-bottom: 18px; }
.view-tools { color: var(--ion-color-medium); margin: 14px 0; }
.view-segment { max-width: 170px; --background: transparent; }
.view-segment ion-segment-button { min-height: 34px; }
.selection-bar { background: var(--ion-color-light); border-radius: 12px; padding: 8px 12px; margin-bottom: 12px; }
.notes-layout { display: grid; gap: 12px; }
.layout-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.layout-card { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.note-card { margin: 0; border-radius: 16px; box-shadow: 0 5px 18px rgba(30, 45, 65, .08); border-left: 5px solid transparent; cursor: pointer; }
.layout-list .note-card { border-radius: 12px; }
.note-card ion-card-content { padding: 16px; }
.note-plain { border-left-color: #7b8794; }.note-sun { background: #fff4cf; border-left-color: #f5b700; }.note-mint { background: #ddf5e9; border-left-color: #36a269; }.note-sky { background: #e0f1ff; border-left-color: #3287c7; }.note-rose { background: #ffe4e8; border-left-color: #db6375; }
.note-title { font-size: 1rem; font-weight: 750; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.note-icons { display: flex; gap: 7px; color: var(--ion-color-primary); }
.note-preview { color: var(--ion-color-medium); min-height: 42px; line-height: 1.45; margin: 12px 0; white-space: pre-line; }
.note-card-bottom small { color: var(--ion-color-medium); }
.empty-state { min-height: 320px; display: grid; place-content: center; justify-items: center; text-align: center; color: var(--ion-color-medium); }
.empty-state ion-icon { font-size: 52px; color: var(--ion-color-primary); }.empty-state h2 { color: var(--ion-text-color); margin-bottom: 4px; }.empty-state p { margin-top: 0; }
.editor-content { --background: var(--ion-background-color); }.editor-title { margin-bottom: 18px; }.editor-label { font-weight: 700; margin: 24px 0 10px; }.color-picker { display: flex; gap: 14px; }.color-dot { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; }.color-dot.selected { border-color: var(--ion-color-dark); box-shadow: 0 0 0 3px var(--ion-color-light); }.dot-plain { background: #b7c0ca; }.dot-sun { background: #f5c84c; }.dot-mint { background: #5dbb88; }.dot-sky { background: #62a9dc; }.dot-rose { background: #db7787; }.editor-toggles { display: flex; gap: 24px; margin-top: 26px; }
</style>
