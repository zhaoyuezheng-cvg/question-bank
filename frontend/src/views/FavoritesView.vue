<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">❤️</span>
        收藏夹
      </h1>
      <div class="filter-bar" style="margin-bottom: 0; padding: 8px 12px;">
        <select class="form-select" v-model="subject" @change="load" style="width: auto; min-width: 140px;">
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
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="tag" :style="{ background: SUBJECT_COLORS[item.question.subject as Subject] + '18', color: SUBJECT_COLORS[item.question.subject as Subject] }">
              {{ getSubjectLabel(item.question.subject as Subject) }}
            </span>
            <span class="tag">{{ item.question.category }}</span>
            <span class="tag">{{ getTypeLabel(item.question.type) }}</span>
          </div>
          <button class="btn btn-sm btn-danger" @click="remove(item.questionId)">取消收藏</button>
        </div>
        <div class="markdown-body" v-html="renderMarkdown(item.question.content)"></div>
        <div style="margin-top: 10px; padding: 10px 14px; background: var(--success-light); border-radius: var(--radius); font-size: 13px;">
          <strong style="color: var(--success);">答案：</strong>{{ item.question.answer?.slice(0, 100) }}
        </div>
        <div v-if="item.note" style="margin-top: 6px; font-size: 12px; color: var(--text-muted);">
          📝 备注：{{ item.note }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import { SUBJECT_LABELS, SUBJECT_COLORS, getSubjectLabel, getTypeLabel } from '@/utils/constants';
import type { Subject } from 'shared/src/index';
import { apiGet, apiDelete } from '@/utils/api';

const items = ref<any[]>([]);
const loading = ref(false);
const subject = ref('');

async function load() {
  loading.value = true;
  const params = new URLSearchParams({ pageSize: '50' });
  if (subject.value) params.set('subject', subject.value);
  const json = await apiGet(`/practice/favorites?${params}`);
  if (json.success) items.value = json.data.items;
  loading.value = false;
}

async function remove(questionId: string) {
  await apiDelete(`/practice/favorites/${questionId}`);
  await load();
}

onMounted(load);
</script>

<style scoped>
.fav-list { display: flex; flex-direction: column; gap: 16px; }
.fav-item { padding: 20px; }
</style>
