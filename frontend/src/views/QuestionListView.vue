<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📝</span>
        题目管理
      </h1>
      <div class="btn-group">
        <button class="btn" @click="handleExport('csv')">📥 CSV</button>
        <button class="btn" @click="handleExport('word')">📥 Word</button>
        <button v-if="selectedIds.length" class="btn" @click="showBatchModal = true">
          ⚡ 批量操作 ({{ selectedIds.length }})
        </button>
        <button v-if="selectedIds.length" class="btn btn-danger" @click="handleBatchDelete">
          🗑️ 删除选中 ({{ selectedIds.length }})
        </button>
        <router-link to="/questions/new" class="btn btn-primary">➕ 新建题目</router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label">学科</label>
        <select class="form-select" v-model="filters.subject" @change="applyFilter">
          <option value="">全部学科</option>
          <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">题型</label>
        <select class="form-select" v-model="filters.type" @change="applyFilter">
          <option value="">全部题型</option>
          <option v-for="(label, key) in QUESTION_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">难度</label>
        <select class="form-select" v-model="filters.difficulty" @change="applyFilter">
          <option value="">全部难度</option>
          <option v-for="n in 5" :key="n" :value="n">{{ DIFFICULTY_LABELS[n as Difficulty] }}</option>
        </select>
      </div>
      <div class="form-group" style="flex: 1; min-width: 200px;">
        <label class="form-label">搜索</label>
        <input class="form-input" v-model="filters.keyword" placeholder="搜索题干/答案... (按 / 聚焦)" @keyup.enter="applyFilter" />
      </div>
      <div class="form-group">
        <label class="form-label">&nbsp;</label>
        <button class="btn btn-primary" @click="applyFilter">🔍 搜索</button>
      </div>
    </div>

    <!-- Table -->
    <div class="card" style="padding: 0; overflow: hidden;">
      <!-- Skeleton Loading -->
      <div v-if="store.loading" style="padding: 20px;">
        <div v-for="n in 5" :key="n" class="skeleton-row">
          <div class="skeleton" style="width: 20px; height: 20px; border-radius: 4px;"></div>
          <div class="skeleton skeleton-line" style="flex: 2; height: 16px;"></div>
          <div class="skeleton skeleton-line" style="width: 60px; height: 16px;"></div>
          <div class="skeleton skeleton-line" style="width: 60px; height: 16px;"></div>
          <div class="skeleton skeleton-line" style="width: 50px; height: 16px;"></div>
          <div class="skeleton skeleton-line" style="width: 80px; height: 16px;"></div>
          <div class="skeleton skeleton-line" style="width: 100px; height: 16px;"></div>
        </div>
      </div>

      <div v-else-if="!store.questions.length" class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>暂无题目，按 <kbd>N</kbd> 新建题目</p>
        <router-link to="/questions/new" class="btn btn-primary" style="margin-top: 16px;">➕ 新建题目</router-link>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th style="width: 44px;">
              <input type="checkbox" @change="toggleAll" :checked="allSelected" />
            </th>
            <th>题干预览</th>
            <th style="width: 80px;">学科</th>
            <th style="width: 80px;">题型</th>
            <th style="width: 70px;">难度</th>
            <th style="width: 100px;">分类</th>
            <th style="width: 120px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in store.questions" :key="q.id">
            <td>
              <input type="checkbox" :value="q.id" v-model="selectedIds" />
            </td>
            <td>
              <QuestionPopover :question="q">
                <div class="q-preview" v-html="renderMarkdown(q.content.slice(0, 150))"></div>
              </QuestionPopover>
            </td>
            <td>
              <span class="tag" :style="{ background: SUBJECT_COLORS[q.subject] + '18', color: SUBJECT_COLORS[q.subject] }">
                {{ getSubjectLabel(q.subject) }}
              </span>
            </td>
            <td>
              <span style="font-size: 13px; color: var(--text-secondary);">{{ getTypeLabel(q.type) }}</span>
            </td>
            <td>
              <span class="diff-badge" :style="{ background: DIFFICULTY_COLORS[q.difficulty] }">
                {{ getDifficultyLabel(q.difficulty) }}
              </span>
            </td>
            <td>
              <span class="tag">{{ q.category }}</span>
            </td>
            <td>
              <div class="btn-group">
                <router-link :to="`/questions/${q.id}/edit`" class="btn btn-sm btn-ghost">✏️</router-link>
                <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="handleDelete(q)">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="store.totalPages > 1" class="pagination">
      <button :disabled="store.page <= 1" @click="goPage(store.page - 1)">‹</button>
      <template v-for="p in displayPages" :key="p">
        <button v-if="p === '...'" disabled style="border: none; background: none;">...</button>
        <button v-else :class="{ active: p === store.page }" @click="goPage(p as number)">{{ p }}</button>
      </template>
      <button :disabled="store.page >= store.totalPages" @click="goPage(store.page + 1)">›</button>
    </div>

    <!-- Batch Update Modal -->
    <div v-if="showBatchModal" class="modal-overlay" @click.self="showBatchModal = false">
      <div class="modal">
        <div class="modal-title">⚡ 批量修改 ({{ selectedIds.length }} 道题)</div>
        <div class="form-group">
          <label class="form-label">修改学科</label>
          <select class="form-select" v-model="batchForm.subject">
            <option value="">不修改</option>
            <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">修改难度</label>
          <select class="form-select" v-model="batchForm.difficulty">
            <option value="0">不修改</option>
            <option v-for="n in 5" :key="n" :value="n">{{ DIFFICULTY_LABELS[n as Difficulty] }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">修改分类</label>
          <input class="form-input" v-model="batchForm.category" placeholder="留空不修改" />
        </div>
        <div class="btn-group" style="margin-top: 20px; justify-content: flex-end;">
          <button class="btn" @click="showBatchModal = false">取消</button>
          <button class="btn btn-primary" @click="handleBatchUpdate">应用修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useQuestionStore } from '@/stores/questionStore';
import { renderMarkdown } from '@/utils/markdown';
import { exportQuestionsCSV, exportQuestionsWord } from '@/utils/export';
import QuestionPopover from '@/components/QuestionPopover.vue';
import {
  SUBJECT_LABELS, SUBJECT_COLORS, QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS, DIFFICULTY_COLORS,
  getSubjectLabel, getTypeLabel, getDifficultyLabel,
} from '@/utils/constants';
import type { Difficulty, Subject, QuestionType } from 'shared/src/index';

const store = useQuestionStore();
const selectedIds = ref<string[]>([]);
const showBatchModal = ref(false);
const toast = inject<(type: string, msg: string, duration?: number, action?: any) => void>('toast')!;
const confirmFn = inject<(opts: any) => Promise<boolean>>('confirm')!;

const filters = ref({
  subject: '',
  type: '',
  difficulty: '',
  keyword: '',
});

const batchForm = ref({
  subject: '',
  difficulty: 0,
  category: '',
});

const allSelected = computed(() =>
  store.questions.length > 0 && selectedIds.value.length === store.questions.length
);

const displayPages = computed(() => {
  const pages: (number | string)[] = [];
  const total = store.totalPages;
  const cur = store.page;
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (cur > 3) pages.push('...');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) {
      pages.push(i);
    }
    if (cur < total - 2) pages.push('...');
    pages.push(total);
  }
  return pages;
});

function applyFilter() {
  selectedIds.value = [];
  store.fetchQuestions({
    subject: (filters.value.subject || undefined) as Subject | undefined,
    type: (filters.value.type || undefined) as QuestionType | undefined,
    difficulty: filters.value.difficulty ? Number(filters.value.difficulty) as Difficulty : undefined,
    keyword: filters.value.keyword || undefined,
  });
}

function goPage(p: number | string) {
  if (typeof p === 'number') {
    store.page = p;
    applyFilter();
  }
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = store.questions.map(q => q.id);
  }
}

// Undo delete
async function handleDelete(q: any) {
  const ok = await confirmFn({ message: '确定删除此题目？', icon: '🗑️' });
  if (!ok) return;

  // Store for undo
  const deleted = { ...q };
  await store.deleteQuestion(q.id);
  toast('success', '已删除', 5000, {
    label: '↩ 撤销',
    fn: async () => {
      await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleted),
      });
      store.fetchQuestions();
      toast('success', '已恢复');
    },
  });
}

async function handleBatchDelete() {
  const ok = await confirmFn({ message: `确定删除选中的 ${selectedIds.value.length} 道题目？`, icon: '🗑️' });
  if (!ok) return;
  await store.batchDelete(selectedIds.value);
  toast('success', `已删除 ${selectedIds.value.length} 道题目`);
  selectedIds.value = [];
}

async function handleBatchUpdate() {
  const updates: any = {};
  if (batchForm.value.subject) updates.subject = batchForm.value.subject;
  if (batchForm.value.difficulty > 0) updates.difficulty = batchForm.value.difficulty;
  if (batchForm.value.category.trim()) updates.category = batchForm.value.category.trim();

  if (Object.keys(updates).length === 0) {
    toast('warning', '请至少填写一项修改');
    return;
  }

  try {
    const res = await fetch('/api/questions/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds.value, updates }),
    });
    const json = await res.json();
    if (json.success) {
      toast('success', `已更新 ${json.data.updated} 道题目`);
      showBatchModal.value = false;
      selectedIds.value = [];
      batchForm.value = { subject: '', difficulty: 0, category: '' };
      store.fetchQuestions();
    } else {
      toast('error', json.error || '更新失败');
    }
  } catch {
    toast('error', '网络错误');
  }
}

async function handleExport(format: 'csv' | 'word') {
  try {
    const params = new URLSearchParams({ pageSize: '1000' });
    if (filters.value.subject) params.set('subject', filters.value.subject);
    if (filters.value.type) params.set('type', filters.value.type);
    if (filters.value.keyword) params.set('keyword', filters.value.keyword);
    const res = await fetch(`/api/questions?${params}`);
    const json = await res.json();
    if (json.success) {
      const items = json.data.items;
      if (format === 'csv') exportQuestionsCSV(items);
      else exportQuestionsWord(items);
      toast('success', `已导出 ${items.length} 道题目`);
    }
  } catch {
    toast('error', '导出失败');
  }
}

onMounted(() => store.fetchQuestions());
</script>

<style scoped>
.q-preview {
  max-height: 60px;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
  cursor: pointer;
}
.q-preview :deep(p) {
  margin: 0;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
}
</style>
