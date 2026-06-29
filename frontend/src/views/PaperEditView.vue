<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">{{ isEdit ? '✏️' : '➕' }}</span>
        {{ isEdit ? '编辑试卷' : '新建试卷' }}
      </h1>
      <div class="btn-group">
        <button class="btn btn-primary" @click="handleSave" :disabled="saving || !form.title">
          {{ saving ? '保存中...' : '💾 保存试卷' }}
        </button>
        <router-link to="/papers" class="btn">取消</router-link>
      </div>
    </div>

    <!-- Paper Config -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-header">
        <span class="card-title">📋 试卷信息</span>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex: 2;">
          <label class="form-label">试卷名称 *</label>
          <input class="form-input" v-model="form.title" placeholder="如：2024年高三语文月考一" />
        </div>
        <div class="form-group">
          <label class="form-label">学科</label>
          <select class="form-select" v-model="form.subject">
            <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">总分</label>
          <input class="form-input" type="number" v-model.number="form.totalScore" placeholder="150" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">说明</label>
        <input class="form-input" v-model="form.description" placeholder="可选，试卷简要说明" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">页眉文字</label>
          <input class="form-input" v-model="form.headerText" placeholder="如：XX中学2024年月考" />
        </div>
        <div class="form-group">
          <label class="form-label">字号 (px)</label>
          <input class="form-input" type="number" v-model.number="form.fontSize" min="10" max="24" />
        </div>
        <div class="form-group">
          <label class="form-label">答题区行数</label>
          <input class="form-input" type="number" v-model.number="form.answerAreaLines" min="1" max="20" />
        </div>
      </div>

      <div class="btn-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.showAnswer" /> 显示答案
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.showAnalysis" /> 显示解析
        </label>
      </div>
    </div>

    <!-- Question selection -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📌 选题（已选 {{ selectedQuestions.length }} 道）</span>
        <button class="btn btn-primary btn-sm" @click="showPicker = true">➕ 添加题目</button>
      </div>

      <div v-if="!selectedQuestions.length" class="empty-state" style="padding: 32px;">
        <div class="empty-state-icon">📌</div>
        <p>尚未选择题目，点击「添加题目」从题库中选取</p>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">💡 提示：添加后可拖拽调整顺序</p>
      </div>

      <div v-else class="selected-questions">
        <div
          v-for="(q, idx) in selectedQuestions"
          :key="q.id"
          class="sq-item"
          :class="{ 'sq-dragging': dragIndex === idx, 'sq-dragover': dragOverIndex === idx }"
          draggable="true"
          @dragstart="onDragStart(idx, $event)"
          @dragover.prevent="onDragOver(idx)"
          @dragend="onDragEnd"
          @drop.prevent="onDrop(idx)"
        >
          <div class="sq-drag-handle">⠿</div>
          <div class="sq-num">{{ idx + 1 }}</div>
          <div class="sq-content">
            <div class="markdown-body" v-html="renderMarkdown(q.content.slice(0, 200))"></div>
            <div class="sq-meta">
              <span class="tag" style="font-size: 11px;">{{ getSubjectLabel(q.subject) }}</span>
              <span class="tag" style="font-size: 11px;">{{ q.category }}</span>
            </div>
          </div>
          <div class="sq-actions">
            <button class="btn btn-sm btn-icon" @click="moveUp(idx)" :disabled="idx === 0">↑</button>
            <button class="btn btn-sm btn-icon" @click="moveDown(idx)" :disabled="idx === selectedQuestions.length - 1">↓</button>
            <button class="btn btn-sm btn-icon" style="color: var(--danger);" @click="removeQuestion(idx)">×</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Question Picker Modal -->
    <div v-if="showPicker" class="modal-overlay" @click.self="showPicker = false">
      <div class="modal" style="max-width: 800px;">
        <div class="modal-title">📌 选择题目</div>
        <div class="filter-bar" style="margin-bottom: 12px;">
          <div class="form-group">
            <select class="form-select" v-model="pickerFilter.subject" @change="loadPickerQuestions">
              <option value="">全部学科</option>
              <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;">
            <input class="form-input" v-model="pickerFilter.keyword" placeholder="搜索..." @keyup.enter="loadPickerQuestions" />
          </div>
          <button class="btn btn-primary" @click="loadPickerQuestions">搜索</button>
        </div>

        <div class="picker-list">
          <div v-for="q in pickerQuestions" :key="q.id" class="picker-item" @click="togglePick(q)">
            <input type="checkbox" :checked="isPicked(q.id)" />
            <div class="picker-content">
              <div class="markdown-body" v-html="renderMarkdown(q.content.slice(0, 150))"></div>
              <span class="tag" style="margin-top: 6px; font-size: 11px;">{{ getSubjectLabel(q.subject) }} · {{ q.category }}</span>
            </div>
          </div>
        </div>

        <div class="btn-group" style="margin-top: 16px; justify-content: flex-end;">
          <button class="btn" @click="showPicker = false">取消</button>
          <button class="btn btn-primary" @click="showPicker = false">确定 (已选 {{ selectedQuestions.length }} 道)</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePaperStore } from '@/stores/paperStore';
import { renderMarkdown } from '@/utils/markdown';
import { SUBJECT_LABELS, getSubjectLabel } from '@/utils/constants';
import { apiGet } from '@/utils/api';
import type { Question, Subject } from 'shared/src/index';

const route = useRoute();
const router = useRouter();
const paperStore = usePaperStore();
const toast = inject<(type: string, msg: string) => void>('toast')!;

const isEdit = computed(() => !!route.params.id);
const saving = ref(false);
const showPicker = ref(false);
const selectedQuestions = ref<Question[]>([]);
const pickerQuestions = ref<Question[]>([]);

// Drag & Drop state
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const form = ref({
  title: '',
  description: '',
  subject: 'chinese' as Subject,
  totalScore: 150,
  headerText: '',
  fontSize: 14,
  answerAreaLines: 5,
  showAnswer: false,
  showAnalysis: true,
});

const pickerFilter = ref({ subject: '', keyword: '' });

// Drag & Drop handlers
function onDragStart(idx: number, e: DragEvent) {
  dragIndex.value = idx;
  e.dataTransfer!.effectAllowed = 'move';
  e.dataTransfer!.setData('text/plain', String(idx));
}

function onDragOver(idx: number) {
  dragOverIndex.value = idx;
}

function onDrop(idx: number) {
  if (dragIndex.value === null || dragIndex.value === idx) return;
  const arr = selectedQuestions.value;
  const [item] = arr.splice(dragIndex.value, 1);
  arr.splice(idx, 0, item);
  dragIndex.value = null;
  dragOverIndex.value = null;
}

function onDragEnd() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}

async function loadPickerQuestions() {
  const params = new URLSearchParams();
  params.set('pageSize', '100');
  if (pickerFilter.value.subject) params.set('subject', pickerFilter.value.subject);
  if (pickerFilter.value.keyword) params.set('keyword', pickerFilter.value.keyword);
  const json = await apiGet(`/questions?${params}`);
  if (json.success) pickerQuestions.value = json.data.items;
}

function isPicked(id: string) {
  return selectedQuestions.value.some(q => q.id === id);
}

function togglePick(q: Question) {
  const idx = selectedQuestions.value.findIndex(s => s.id === q.id);
  if (idx >= 0) {
    selectedQuestions.value.splice(idx, 1);
  } else {
    selectedQuestions.value.push(q);
  }
}

function removeQuestion(idx: number) {
  selectedQuestions.value.splice(idx, 1);
}

function moveUp(idx: number) {
  if (idx <= 0) return;
  const arr = selectedQuestions.value;
  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
}

function moveDown(idx: number) {
  const arr = selectedQuestions.value;
  if (idx >= arr.length - 1) return;
  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
}

async function handleSave() {
  if (!form.value.title.trim()) {
    toast('error', '试卷名称不能为空');
    return;
  }

  saving.value = true;
  try {
    const data = {
      ...form.value,
      questionIds: selectedQuestions.value.map(q => q.id),
      layoutConfig: {
        showAnswer: form.value.showAnswer,
        showAnalysis: form.value.showAnalysis,
        answerAreaLines: form.value.answerAreaLines,
        fontSize: form.value.fontSize,
        headerText: form.value.headerText,
      },
    };

    let res;
    if (isEdit.value) {
      res = await paperStore.updatePaper(route.params.id as string, data);
    } else {
      res = await paperStore.createPaper(data);
    }

    if (res.success) {
      toast('success', isEdit.value ? '试卷已更新' : '试卷已创建');
      router.push('/papers');
    } else {
      toast('error', '保存失败: ' + (res.error || '未知错误'));
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadPickerQuestions();

  if (isEdit.value) {
    const p = await paperStore.fetchPaper(route.params.id as string);
    if (p) {
      form.value = {
        title: p.title,
        description: p.description || '',
        subject: p.subject,
        totalScore: p.totalScore || 150,
        headerText: (p as any).layoutConfig?.headerText || '',
        fontSize: (p as any).layoutConfig?.fontSize || 14,
        answerAreaLines: (p as any).layoutConfig?.answerAreaLines || 5,
        showAnswer: (p as any).layoutConfig?.showAnswer || false,
        showAnalysis: (p as any).layoutConfig?.showAnalysis ?? true,
      };
      selectedQuestions.value = (p as any).questions || [];
    }
  }
});
</script>

<style scoped>
.selected-questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sq-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  align-items: flex-start;
  transition: all var(--transition-fast);
  cursor: grab;
  user-select: none;
}

.sq-item:active {
  cursor: grabbing;
}

.sq-item:hover {
  border-color: var(--primary-light);
  background: var(--primary-50);
}

.sq-dragging {
  opacity: 0.4;
  transform: scale(0.98);
}

.sq-dragover {
  border-color: var(--primary);
  border-style: dashed;
  background: var(--primary-50);
}

.sq-drag-handle {
  font-size: 18px;
  color: var(--text-muted);
  cursor: grab;
  padding: 4px 2px;
  line-height: 1;
}

.sq-num {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.sq-content {
  flex: 1;
  min-width: 0;
}

.sq-meta {
  margin-top: 6px;
  display: flex;
  gap: 4px;
}

.sq-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.picker-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.picker-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.picker-item:hover {
  border-color: var(--primary-light);
  background: var(--primary-50);
}

.picker-content {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}
</style>
