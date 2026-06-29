<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📖</span>
        阅读材料
      </h1>
      <div class="btn-group">
        <router-link to="/passages/new" class="btn btn-primary">➕ 新建材料</router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label">学科</label>
        <select class="form-select" v-model="filters.subject" @change="loadData">
          <option value="">全部学科</option>
          <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">分类</label>
        <select class="form-select" v-model="filters.category" @change="loadData">
          <option value="">全部分类</option>
          <option v-for="c in availableCategories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="form-group" style="flex: 1;">
        <label class="form-label">搜索</label>
        <input class="form-input" v-model="filters.keyword" placeholder="搜索标题/内容..." @keyup.enter="loadData" />
      </div>
      <div class="form-group">
        <label class="form-label">&nbsp;</label>
        <button class="btn btn-primary" @click="loadData">🔍 搜索</button>
      </div>
    </div>

    <!-- List -->
    <div v-if="loading" class="card" style="padding: 40px; text-align: center; color: var(--text-muted);">加载中...</div>
    <div v-else-if="!passages.length" class="card empty-state">
      <div class="empty-state-icon">📖</div>
      <p>暂无阅读材料</p>
      <router-link to="/passages/new" class="btn btn-primary" style="margin-top: 16px;">➕ 新建材料</router-link>
    </div>
    <div v-else>
      <div v-for="p in passages" :key="p.id" class="card passage-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span class="tag" :style="{ background: SUBJECT_COLORS[p.subject as keyof typeof SUBJECT_COLORS] + '18', color: SUBJECT_COLORS[p.subject as keyof typeof SUBJECT_COLORS] }">
                {{ getSubjectLabel(p.subject as any) }}
              </span>
              <span v-if="p.category" class="tag">{{ p.category }}</span>
              <span v-if="p.subCategory" class="tag" style="opacity: 0.7;">{{ p.subCategory }}</span>
              <span style="font-size: 12px; color: var(--text-muted); margin-left: auto;">
                {{ p.questions?.length || 0 }} 道子题
              </span>
            </div>
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">{{ p.title }}</h3>
            <div class="passage-preview markdown-body" v-html="renderMarkdown(p.content.slice(0, 200))"></div>
            <div v-if="p.questions?.length" style="margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap;">
              <span v-for="q in p.questions.slice(0, 5)" :key="q.id" class="tag" style="font-size: 11px;">
                {{ getTypeLabel(q.type as any) }}{{ q.subType ? ' · ' + getSubTypeLabel(q.subType) : '' }}
                <span class="diff-badge-mini" :style="{ background: DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS] }">{{ q.difficulty }}</span>
              </span>
              <span v-if="p.questions.length > 5" class="tag" style="font-size: 11px;">+{{ p.questions.length - 5 }}</span>
            </div>
          </div>
          <div class="btn-group" style="margin-left: 16px; flex-shrink: 0;">
            <router-link :to="`/passages/${p.id}`" class="btn btn-sm">👁️ 查看</router-link>
            <router-link :to="`/passages/${p.id}/edit`" class="btn btn-sm btn-ghost">✏️</router-link>
            <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="handleDelete(p)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page <= 1" @click="page--; loadData()">‹</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++; loadData()">›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import {
  SUBJECT_LABELS, SUBJECT_COLORS, DIFFICULTY_COLORS,
  getSubjectLabel, getTypeLabel, getSubTypeLabel,
} from '@/utils/constants';
import { apiGet, apiDelete } from '@/utils/api';

const toast = inject<(type: string, msg: string) => void>('toast')!;
const confirmFn = inject<(opts: any) => Promise<boolean>>('confirm')!;

const passages = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const totalPages = ref(0);
const filters = ref({ subject: '', category: '', keyword: '' });

const availableCategories = computed(() => {
  const cats = new Set<string>();
  passages.value.forEach(p => { if (p.category) cats.add(p.category); });
  return Array.from(cats);
});

async function loadData() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: '20' });
    if (filters.value.subject) params.set('subject', filters.value.subject);
    if (filters.value.category) params.set('category', filters.value.category);
    if (filters.value.keyword) params.set('keyword', filters.value.keyword);
    const json = await apiGet(`/passages?${params}`);
    if (json.success) {
      passages.value = json.data.items;
      totalPages.value = json.data.totalPages;
    }
  } finally {
    loading.value = false;
  }
}

async function handleDelete(p: any) {
  const ok = await confirmFn({ message: `确定删除「${p.title}」？关联的子题不会被删除。`, icon: '🗑️' });
  if (!ok) return;
  await apiDelete(`/passages/${p.id}`);
  toast('success', '已删除');
  loadData();
}

onMounted(loadData);
</script>

<style scoped>
.passage-card { margin-bottom: 12px; }
.passage-preview {
  font-size: 13px; color: var(--text-secondary); line-height: 1.6;
  max-height: 60px; overflow: hidden;
}
.passage-preview :deep(p) { margin: 0; }
.diff-badge-mini {
  display: inline-block; width: 16px; height: 16px; border-radius: 50%;
  color: white; font-size: 10px; text-align: center; line-height: 16px; margin-left: 4px;
}
.pagination {
  display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px;
}
.pagination button {
  width: 36px; height: 36px; border-radius: var(--radius);
  border: 1px solid var(--border); background: var(--bg-card);
  cursor: pointer; font-size: 16px;
}
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-secondary); }
</style>
