<template>
  <div>
    <div class="card-header" style="margin-bottom: 16px;">
      <h1>📝 题目管理</h1>
      <div class="btn-group">
        <router-link to="/questions/new" class="btn btn-primary">➕ 新建题目</router-link>
        <button v-if="selectedIds.length" class="btn btn-danger" @click="handleBatchDelete">
          🗑️ 删除选中 ({{ selectedIds.length }})
        </button>
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
        <button class="btn" @click="applyFilter">🔍 搜索</button>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="store.loading" class="loading">加载中...</div>
      <div v-else-if="!store.questions.length" class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>暂无题目，点击右上角「新建题目」开始</p>
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" @change="toggleAll" :checked="allSelected" />
            </th>
            <th>题干预览</th>
            <th style="width: 80px;">学科</th>
            <th style="width: 80px;">题型</th>
            <th style="width: 60px;">难度</th>
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
              <span class="tag" :style="{ background: SUBJECT_COLORS[q.subject] + '20', color: SUBJECT_COLORS[q.subject] }">
                {{ getSubjectLabel(q.subject) }}
              </span>
            </td>
            <td>{{ getTypeLabel(q.type) }}</td>
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
                <router-link :to="`/questions/${q.id}/edit`" class="btn btn-sm">编辑</router-link>
                <button class="btn btn-sm btn-danger" @click="handleDelete(q.id)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="store.totalPages > 1" class="pagination">
        <button :disabled="store.page <= 1" @click="goPage(store.page - 1)">‹ 上一页</button>
        <template v-for="p in displayPages" :key="p">
          <button v-if="p === '...'" disabled>...</button>
          <button v-else :class="{ active: p === store.page }" @click="goPage(p as number)">{{ p }}</button>
        </template>
        <button :disabled="store.page >= store.totalPages" @click="goPage(store.page + 1)">下一页 ›</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuestionStore } from '@/stores/questionStore';
import { renderMarkdown } from '@/utils/markdown';
import {
  SUBJECT_LABELS, SUBJECT_COLORS, QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS, DIFFICULTY_COLORS,
  getSubjectLabel, getTypeLabel, getDifficultyLabel,
} from '@/utils/constants';
import type { Difficulty } from 'shared/src/index';

const store = useQuestionStore();
const selectedIds = ref<string[]>([]);

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
    subject: filters.value.subject || undefined,
    type: filters.value.type || undefined,
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
  if (!confirm('确定删除此题目？')) return;
  await store.deleteQuestion(id);
}

async function handleBatchDelete() {
  if (!confirm(`确定删除选中的 ${selectedIds.value.length} 道题目？`)) return;
  await store.batchDelete(selectedIds.value);
  selectedIds.value = [];
}

onMounted(() => store.fetchQuestions());
</script>

<style scoped>
.q-preview {
  max-height: 60px;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-secondary);
}
.q-preview :deep(p) {
  margin: 0;
}
</style>
