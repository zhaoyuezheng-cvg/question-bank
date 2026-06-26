<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📋</span>
        错题本
      </h1>
      <div class="btn-group">
        <button class="btn" :class="{ 'btn-primary': mode === 'list' }" @click="mode = 'list'">📋 列表</button>
        <button class="btn" :class="{ 'btn-primary': mode === 'review' }" @click="mode = 'review'; loadReview()">🔄 间隔复习</button>
        <button class="btn" @click="exportErrors">📥 导出</button>
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
        <label class="form-label">状态</label>
        <select class="form-select" v-model="filters.isResolved" @change="loadData">
          <option value="">全部</option>
          <option value="false">未掌握</option>
          <option value="true">已掌握</option>
        </select>
      </div>
    </div>

    <!-- List Mode -->
    <div v-if="mode === 'list'">
      <div v-if="!errors.length" class="card empty-state" style="padding: 32px;">
        <p>{{ filters.isResolved === 'false' ? '没有未掌握的错题 🎉' : '暂无错题' }}</p>
      </div>
      <div v-for="e in errors" :key="e.id" class="card error-card" :class="{ resolved: e.isResolved }">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span class="tag" :style="{ background: SUBJECT_COLORS[e.question?.subject as keyof typeof SUBJECT_COLORS] + '18', color: SUBJECT_COLORS[e.question?.subject as keyof typeof SUBJECT_COLORS] }">
                {{ getSubjectLabel(e.question?.subject as any) }}
              </span>
              <span class="tag">{{ e.question?.category }}</span>
              <span v-if="e.question?.subType" class="tag" style="background: var(--primary-50); color: var(--primary);">{{ getSubTypeLabel(e.question?.subType) }}</span>
              <span class="diff-badge" :style="{ background: DIFFICULTY_COLORS[e.question?.difficulty as keyof typeof DIFFICULTY_COLORS] }">
                {{ e.question?.difficulty }}
              </span>
              <span style="font-size: 11px; color: var(--text-muted); margin-left: auto;">
                {{ formatDate(e.createdAt) }}
              </span>
            </div>
            <div class="markdown-body" style="font-size: 14px;" v-html="renderMarkdown(e.question?.content?.slice(0, 200) || '')"></div>
            <div v-if="e.wrongAnswer" style="margin-top: 8px; font-size: 12px;">
              <span style="color: var(--danger);">你的答案：{{ e.wrongAnswer }}</span>
              <span style="color: var(--success); margin-left: 12px;">正确答案：{{ e.question?.answer }}</span>
            </div>
            <div v-if="e.errorNote" style="margin-top: 4px; font-size: 12px; color: var(--text-muted);">
              📝 {{ e.errorNote }}
            </div>
          </div>
          <div class="btn-group" style="margin-left: 12px; flex-shrink: 0;">
            <button v-if="!e.isResolved" class="btn btn-sm btn-success" @click="markResolved(e)">✅ 掌握</button>
            <button v-else class="btn btn-sm" @click="markUnresolved(e)">↩ 重学</button>
            <button class="btn btn-sm" @click="addToFlashcard(e.questionId)">🃏 闪卡</button>
            <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="deleteError(e.id)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Mode (Spaced Repetition) -->
    <div v-if="mode === 'review'">
      <div v-if="!reviewQueue.length" class="card empty-state" style="padding: 48px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
        <p>今日错题复习已完成！</p>
        <button class="btn btn-primary" style="margin-top: 16px;" @click="mode = 'list'">查看全部错题</button>
      </div>

      <div v-else-if="!showReviewAnswer" class="card" style="max-width: 700px; margin: 0 auto; padding: 32px;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
          {{ reviewIdx + 1 }} / {{ reviewQueue.length }} · 待复习
        </div>
        <div class="markdown-body" style="font-size: 16px; line-height: 1.8;" v-html="renderMarkdown(reviewQueue[reviewIdx]?.question?.content || '')"></div>
        <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 24px;" @click="showReviewAnswer = true">
          👁️ 显示答案
        </button>
      </div>

      <div v-else class="card" style="max-width: 700px; margin: 0 auto; padding: 32px;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
          {{ reviewIdx + 1 }} / {{ reviewQueue.length }}
        </div>
        <div class="markdown-body" style="font-size: 16px; line-height: 1.8;" v-html="renderMarkdown(reviewQueue[reviewIdx]?.question?.content || '')"></div>

        <div style="margin-top: 16px; padding: 16px; background: var(--success-light); border-radius: var(--radius);">
          <div style="font-size: 11px; font-weight: 700; color: var(--success); margin-bottom: 8px;">答案</div>
          <div class="markdown-body" v-html="renderMarkdown(reviewQueue[reviewIdx]?.question?.answer || '')"></div>
        </div>

        <div v-if="reviewQueue[reviewIdx]?.question?.analysis" style="margin-top: 12px; padding: 16px; background: var(--bg); border-radius: var(--radius);">
          <div style="font-size: 11px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">解析</div>
          <div class="markdown-body" v-html="renderMarkdown(reviewQueue[reviewIdx]?.question?.analysis || '')"></div>
        </div>

        <div style="margin-top: 24px; display: flex; gap: 12px;">
          <button class="btn btn-lg" style="flex: 1; border-color: var(--danger); color: var(--danger);" @click="reviewAnswer(false)">
            😵 还是不会
          </button>
          <button class="btn btn-lg btn-success" style="flex: 1;" @click="reviewAnswer(true)">
            ✅ 已掌握
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import {
  SUBJECT_LABELS, SUBJECT_COLORS, DIFFICULTY_COLORS,
  getSubjectLabel, getSubTypeLabel,
} from '@/utils/constants';

const toast = inject<(type: string, msg: string) => void>('toast')!;

const mode = ref<'list' | 'review'>('list');
const errors = ref<any[]>([]);
const reviewQueue = ref<any[]>([]);
const reviewIdx = ref(0);
const showReviewAnswer = ref(false);
const filters = ref({ subject: '', isResolved: 'false' });

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('zh-CN');
}

async function loadData() {
  const params = new URLSearchParams({ pageSize: '100' });
  if (filters.value.subject) params.set('subject', filters.value.subject);
  if (filters.value.isResolved) params.set('isResolved', filters.value.isResolved);
  const res = await fetch(`/api/practice/errors?${params}`);
  const json = await res.json();
  if (json.success) errors.value = json.data.items;
}

async function loadReview() {
  const params = new URLSearchParams({ limit: '20' });
  if (filters.value.subject) params.set('subject', filters.value.subject);
  const res = await fetch(`/api/study/error-review?${params}`);
  const json = await res.json();
  if (json.success) {
    reviewQueue.value = json.data;
    reviewIdx.value = 0;
    showReviewAnswer.value = false;
  }
}

async function reviewAnswer(isCorrect: boolean) {
  const item = reviewQueue.value[reviewIdx.value];
  await fetch(`/api/study/error-review/${item.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isCorrect }),
  });

  if (reviewIdx.value < reviewQueue.value.length - 1) {
    reviewIdx.value++;
    showReviewAnswer.value = false;
  } else {
    toast('success', '🎉 今日错题复习完成！');
    mode.value = 'list';
    loadData();
  }
}

async function markResolved(e: any) {
  await fetch(`/api/practice/errors/${e.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isResolved: true }),
  });
  toast('success', '已标记为掌握');
  loadData();
}

async function markUnresolved(e: any) {
  await fetch(`/api/practice/errors/${e.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isResolved: false }),
  });
  loadData();
}

async function deleteError(id: string) {
  await fetch(`/api/practice/errors/${id}`, { method: 'DELETE' });
  loadData();
}

async function addToFlashcard(questionId: string) {
  await fetch('/api/flashcards/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId }),
  });
  toast('success', '已加入闪卡');
}

function exportErrors() {
  const data = errors.value.map(e => ({
    subject: e.question?.subject,
    category: e.question?.category,
    subType: e.question?.subType,
    content: e.question?.content,
    answer: e.question?.answer,
    wrongAnswer: e.wrongAnswer,
    analysis: e.question?.analysis,
    isResolved: e.isResolved,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `错题本_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(loadData);
</script>

<style scoped>
.error-card { margin-bottom: 8px; }
.error-card.resolved { opacity: 0.6; border-left: 3px solid var(--success); }
</style>
