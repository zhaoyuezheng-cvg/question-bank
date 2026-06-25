<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📝</span>
        题目管理
      </h1>
      <div class="btn-group">
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
        <input class="form-input" v-model="filters.keyword" placeholder="搜索题干/答案..." @keyup.enter="applyFilter" />
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
        <p>暂无题目，点击右上角「新建题目」开始</p>
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
              <div class="q-preview" v-html="renderMarkdown(q.content.slice(0, 150))"></div>
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
                <router-link :to="`/questions/${q.id}/edit`" class="btn btn-sm btn-ghost">✏️ 编辑</router-link>
                <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="handleDelete(q.id)">🗑️</button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useQuestionStore } from '@/stores/questionStore';
import { renderMarkdown } from '@/utils/markdown';
import {
  SUBJECT_LABELS, SUBJECT_COLORS, QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS, DIFFICULTY_COLORS,
  getSubjectLabel, getTypeLabel, getDifficultyLabel,
} from '@/utils/constants';
import type { Difficulty, Subject, QuestionType } from 'shared/src/index';

const store = useQuestionStore();
const selectedIds = ref<string[]>([]);
const toast = inject<(type: string, msg: string) => void>('toast')!;
const confirmFn = inject<(opts: any) => Promise<boolean>>('confirm')!;

const filters = ref({
  subject: '',
  type: '',
  difficulty: '',
  keyword: '',
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

async function handleDelete(id: string) {
  const ok = await confirmFn({ message: '确定删除此题目？删除后不可恢复。', icon: '🗑️' });
  if (!ok) return;
  await store.deleteQuestion(id);
  toast('success', '删除成功');
}

async function handleBatchDelete() {
  const ok = await confirmFn({ message: `确定删除选中的 ${selectedIds.value.length} 道题目？`, icon: '🗑️' });
  if (!ok) return;
  await store.batchDelete(selectedIds.value);
  selectedIds.value = [];
  toast('success', '批量删除成功');
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
