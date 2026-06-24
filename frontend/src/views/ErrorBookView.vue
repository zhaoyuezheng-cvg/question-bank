<template>
  <div>
    <div class="card-header" style="margin-bottom: 16px;">
      <h1>📝 错题本</h1>
      <div class="btn-group">
        <button class="btn" :class="{ 'btn-primary': filter === 'all' }" @click="filter = 'all'; load()">全部</button>
        <button class="btn" :class="{ 'btn-primary': filter === 'unresolved' }" @click="filter = 'unresolved'; load()">未掌握</button>
        <button class="btn" :class="{ 'btn-primary': filter === 'resolved' }" @click="filter = 'resolved'; load()">已掌握</button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="!items.length" class="empty-state">
      <div class="empty-state-icon">🎉</div>
      <p>{{ filter === 'unresolved' ? '没有未掌握的错题，太棒了！' : '错题本为空' }}</p>
    </div>

    <div v-else class="error-list">
      <div v-for="item in items" :key="item.id" class="card error-item">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span class="tag">{{ getSubjectLabel(item.question.subject) }}</span>
            <span class="tag">{{ item.question.category }}</span>
            <span v-if="item.isResolved" class="tag" style="background: #f0fdf4; color: var(--success);">已掌握</span>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm" @click="toggleResolved(item)">
              {{ item.isResolved ? '标记未掌握' : '✅ 标记已掌握' }}
            </button>
            <button class="btn btn-sm btn-danger" @click="remove(item.id)">移除</button>
          </div>
        </div>

        <div class="markdown-body" style="margin-top: 12px;" v-html="renderMarkdown(item.question.content)"></div>

        <div v-if="item.wrongAnswer" style="margin-top: 8px; font-size: 13px; color: var(--danger);">
          <strong>你的答案：</strong>{{ item.wrongAnswer }}
        </div>
        <div style="margin-top: 8px; font-size: 13px; color: var(--success);">
          <strong>正确答案：</strong>
          <div class="markdown-body" v-html="renderMarkdown(item.question.answer)"></div>
        </div>
        <div v-if="item.question.analysis" style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
          <strong>解析：</strong>
          <div class="markdown-body" v-html="renderMarkdown(item.question.analysis)"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import { getSubjectLabel } from '@/utils/constants';

const items = ref<any[]>([]);
const loading = ref(false);
const filter = ref('unresolved');

async function load() {
  loading.value = true;
  const params = new URLSearchParams();
  if (filter.value === 'unresolved') params.set('isResolved', 'false');
  if (filter.value === 'resolved') params.set('isResolved', 'true');
  params.set('pageSize', '50');

  const res = await fetch(`/api/practice/errors?${params}`);
  const json = await res.json();
  if (json.success) items.value = json.data.items;
  loading.value = false;
}

async function toggleResolved(item: any) {
  await fetch(`/api/practice/errors/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isResolved: !item.isResolved }),
  });
  await load();
}

async function remove(id: string) {
  await fetch(`/api/practice/errors/${id}`, { method: 'DELETE' });
  await load();
}

onMounted(load);
</script>

<style scoped>
.error-list { display: flex; flex-direction: column; gap: 12px; }
.error-item { padding: 16px; }
</style>
