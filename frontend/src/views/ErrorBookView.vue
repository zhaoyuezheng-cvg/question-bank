<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📋</span>
        错题本
      </h1>
      <div class="btn-group">
        <button class="btn" :class="{ 'btn-primary': filter === 'all' }" @click="filter = 'all'; load()">全部</button>
        <button class="btn" :class="{ 'btn-primary': filter === 'unresolved' }" @click="filter = 'unresolved'; load()">未掌握</button>
        <button class="btn" :class="{ 'btn-primary': filter === 'resolved' }" @click="filter = 'resolved'; load()">已掌握</button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="!items.length" class="empty-state">
      <div class="empty-state-icon">{{ filter === 'unresolved' ? '🎉' : '📋' }}</div>
      <p>{{ filter === 'unresolved' ? '没有未掌握的错题，太棒了！' : '错题本为空' }}</p>
    </div>

    <div v-else class="error-list">
      <div v-for="item in items" :key="item.id" class="card error-item">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="tag" :style="{ background: SUBJECT_COLORS[item.question.subject as Subject] + '18', color: SUBJECT_COLORS[item.question.subject as Subject] }">
              {{ getSubjectLabel(item.question.subject as Subject) }}
            </span>
            <span class="tag">{{ item.question.category }}</span>
            <span v-if="item.isResolved" class="tag" style="background: var(--success-light); color: var(--success);">✅ 已掌握</span>
            <span v-else class="tag" style="background: var(--warning-light); color: var(--warning);">⏳ 未掌握</span>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm" @click="toggleResolved(item)">
              {{ item.isResolved ? '↩️ 标记未掌握' : '✅ 标记已掌握' }}
            </button>
            <button class="btn btn-sm btn-danger" @click="remove(item.id)">移除</button>
          </div>
        </div>

        <div class="markdown-body" v-html="renderMarkdown(item.question.content)"></div>

        <div v-if="item.wrongAnswer" style="margin-top: 12px; padding: 10px 14px; background: var(--danger-light); border-radius: var(--radius); font-size: 13px;">
          <strong style="color: var(--danger);">你的答案：</strong>{{ item.wrongAnswer }}
        </div>
        <div style="margin-top: 10px; padding: 10px 14px; background: var(--success-light); border-radius: var(--radius); font-size: 13px;">
          <strong style="color: var(--success);">正确答案：</strong>
          <div class="markdown-body" v-html="renderMarkdown(item.question.answer)"></div>
        </div>
        <div v-if="item.question.analysis" style="margin-top: 10px; padding: 10px 14px; background: var(--primary-50); border-radius: var(--radius); font-size: 13px;">
          <strong style="color: var(--primary);">解析：</strong>
          <div class="markdown-body" v-html="renderMarkdown(item.question.analysis)"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import { getSubjectLabel, SUBJECT_COLORS } from '@/utils/constants';
import type { Subject } from 'shared/src/index';
import { apiGet, apiPut, apiDelete } from '@/utils/api';

const items = ref<any[]>([]);
const loading = ref(false);
const filter = ref('unresolved');

async function load() {
  loading.value = true;
  const params = new URLSearchParams();
  if (filter.value === 'unresolved') params.set('isResolved', 'false');
  if (filter.value === 'resolved') params.set('isResolved', 'true');
  params.set('pageSize', '50');

  const json = await apiGet(`/practice/errors?${params}`);
  if (json.success) items.value = json.data.items;
  loading.value = false;
}

async function toggleResolved(item: any) {
  await apiPut(`/practice/errors/${item.id}`, { isResolved: !item.isResolved });
  await load();
}

async function remove(id: string) {
  await apiDelete(`/practice/errors/${id}`);
  await load();
}

onMounted(load);
</script>

<style scoped>
.error-list { display: flex; flex-direction: column; gap: 16px; }
.error-item { padding: 20px; }
</style>
