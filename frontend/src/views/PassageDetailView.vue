<template>
  <div v-if="passage">
    <div class="page-header no-print">
      <h1 class="page-title">
        <span class="title-icon">📖</span>
        {{ passage.title }}
      </h1>
      <div class="btn-group">
        <button class="btn btn-primary" @click="startPractice">🎯 专项练习</button>
        <router-link :to="`/passages/${passage.id}/edit`" class="btn">✏️ 编辑</router-link>
        <router-link to="/passages" class="btn">← 返回</router-link>
      </div>
    </div>

    <!-- Passage Meta -->
    <div class="card" style="margin-bottom: 0;">
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <span class="tag" :style="{ background: SUBJECT_COLORS[passage.subject as keyof typeof SUBJECT_COLORS] + '18', color: SUBJECT_COLORS[passage.subject as keyof typeof SUBJECT_COLORS] }">
          {{ getSubjectLabel(passage.subject as any) }}
        </span>
        <span v-if="passage.category" class="tag">{{ passage.category }}</span>
        <span v-if="passage.subCategory" class="tag">{{ passage.subCategory }}</span>
        <span v-if="passage.source" class="tag" style="opacity: 0.6;">{{ passage.source }}</span>
        <span style="margin-left: auto; font-size: 13px; color: var(--text-muted);">
          {{ passage.questions?.length || 0 }} 道题
        </span>
      </div>
    </div>

    <!-- Reading Layout: Passage + Questions -->
    <div class="reading-layout">
      <!-- Passage Content -->
      <div class="card passage-content-card">
        <div class="card-header">
          <span class="card-title">📄 原文</span>
        </div>
        <div class="markdown-body passage-text" v-html="renderMarkdown(passage.content)"></div>
      </div>

      <!-- Questions -->
      <div class="questions-section">
        <div v-for="(q, idx) in passage.questions" :key="q.id" class="card question-card">
          <div class="q-header">
            <span class="q-num">{{ idx + 1 }}.</span>
            <span class="tag" style="font-size: 11px;">{{ getTypeLabel(q.type as any) }}</span>
            <span v-if="q.subType" class="tag" style="font-size: 11px; background: var(--primary-50); color: var(--primary);">
              {{ getSubTypeLabel(q.subType) }}
            </span>
            <span class="diff-badge" :style="{ background: DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS] }">
              {{ getDifficultyLabel(q.difficulty as any) }}
            </span>
          </div>
          <div class="markdown-body q-content" v-html="renderMarkdown(q.content)"></div>
          <div v-if="q.options?.length" class="q-options">
            <div v-for="(opt, oi) in q.options" :key="oi" class="q-option">
              <span class="opt-letter">{{ String.fromCharCode(65 + oi) }}.</span>
              <span>{{ opt }}</span>
            </div>
          </div>
          <div v-if="showAnswer" class="q-answer-section">
            <div class="q-answer">
              <strong>【答案】</strong>
              <div class="markdown-body" v-html="renderMarkdown(q.answer)"></div>
            </div>
            <div v-if="q.analysis" class="q-analysis">
              <strong>【解析】</strong>
              <div class="markdown-body" v-html="renderMarkdown(q.analysis)"></div>
            </div>
          </div>
        </div>

        <div v-if="!passage.questions?.length" class="card empty-state" style="padding: 32px;">
          <p>暂无子题</p>
          <router-link :to="`/passages/${passage.id}/edit`" class="btn btn-primary" style="margin-top: 12px;">去添加子题</router-link>
        </div>
      </div>
    </div>

    <!-- Toggle Answer -->
    <div class="card" style="text-align: center; margin-top: 16px;">
      <button class="btn btn-lg" :class="{ 'btn-primary': showAnswer }" @click="showAnswer = !showAnswer">
        {{ showAnswer ? '🙈 隐藏答案' : '👁️ 显示答案' }}
      </button>
    </div>
  </div>

  <div v-else class="card" style="padding: 40px; text-align: center; color: var(--text-muted);">
    加载中...
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { renderMarkdown } from '@/utils/markdown';
import {
  SUBJECT_COLORS, DIFFICULTY_COLORS,
  getSubjectLabel, getTypeLabel, getDifficultyLabel, getSubTypeLabel,
} from '@/utils/constants';

const route = useRoute();
const router = useRouter();
const passage = ref<any>(null);
const showAnswer = ref(false);

async function loadData() {
  const res = await fetch(`/api/passages/${route.params.id}`);
  const json = await res.json();
  if (json.success) passage.value = json.data;
}

function startPractice() {
  if (!passage.value?.questions?.length) return;
  // Navigate to practice with passage filter
  const qIds = passage.value.questions.map((q: any) => q.id).join(',');
  router.push({ path: '/practice', query: { passageId: passage.value.id } });
}

onMounted(loadData);
</script>

<style scoped>
.reading-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
  margin-top: 16px;
}

.passage-content-card {
  position: sticky;
  top: 28px;
}

.passage-text {
  font-size: 15px;
  line-height: 2;
  text-indent: 2em;
}

.questions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-card {
  border-left: 3px solid var(--primary);
}

.q-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.q-num {
  font-size: 18px;
  font-weight: 800;
  color: var(--primary);
}

.q-content {
  font-size: 15px;
  margin-bottom: 12px;
}

.q-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.q-option {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg);
  font-size: 14px;
}

.opt-letter {
  font-weight: 700;
  color: var(--primary);
  min-width: 20px;
}

.q-answer-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}

.q-answer {
  margin-bottom: 8px;
  color: var(--success);
}

.q-analysis {
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 1024px) {
  .reading-layout {
    grid-template-columns: 1fr;
  }
  .passage-content-card {
    position: static;
  }
}
</style>
