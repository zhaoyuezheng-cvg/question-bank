<template>
  <div>
    <h1 style="margin-bottom: 16px;">❤️ 收藏夹</h1>

    <div class="filter-bar">
      <div class="form-group">
        <select class="form-select" v-model="subject" @change="load">
          <option value="">全部学科</option>
          <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="!items.length" class="empty-state">
      <div class="empty-state-icon">⭐</div>
      <p>暂无收藏，在答题练习中可以收藏题目</p>
    </div>

    <div v-else class="fav-list">
      <div v-for="item in items" :key="item.id" class="card fav-item">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span class="tag">{{ getSubjectLabel(item.question.subject) }}</span>
            <span class="tag">{{ item.question.category }}</span>
            <span class="tag">{{ getTypeLabel(item.question.type) }}</span>
          </div>
          <button class="btn btn-sm btn-danger" @click="remove(item.questionId)">取消收藏</button>
        </div>
        <div class="markdown-body" style="margin-top: 12px;" v-html="renderMarkdown(item.question.content)"></div>
        <div style="margin-top: 8px; font-size: 13px; color: var(--success);">
          <strong>答案：</strong>{{ item.question.answer?.slice(0, 100) }}
        </div>
        <div v-if="item.note" style="margin-top: 4px; font-size: 12px; color: var(--text-muted);">
          备注：{{ item.note }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import { SUBJECT_LABELS, getSubjectLabel, getTypeLabel } from '@/utils/constants';

const items = ref<any[]>([]);
const loading = ref(false);
const subject = ref('');

async function load() {
  loading.value = true;
  const params = new URLSearchParams({ pageSize: '50' });
  if (subject.value) params.set('subject', subject.value);
  const res = await fetch(`/api/practice/favorites?${params}`);
  const json = await res.json();
  if (json.success) items.value = json.data.items;
  loading.value = false;
}

async function remove(questionId: string) {
  await fetch(`/api/practice/favorites/${questionId}`, { method: 'DELETE' });
  await load();
}

onMounted(load);
</script>

<style scoped>
.fav-list { display: flex; flex-direction: column; gap: 12px; }
.fav-item { padding: 16px; }
</style>
