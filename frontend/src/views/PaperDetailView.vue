<template>
  <div v-if="paper">
    <div class="page-header no-print">
      <h1 class="page-title">
        <span class="title-icon">📄</span>
        {{ paper.title }}
      </h1>
      <div class="btn-group">
        <router-link to="/papers" class="btn">← 返回列表</router-link>
        <router-link :to="`/papers/${paper.id}/edit`" class="btn">✏️ 编辑</router-link>
        <button class="btn btn-primary" @click="handlePrint">🖨️ 打印</button>
      </div>
    </div>

    <!-- Print preview -->
    <div class="paper-print" ref="printArea">
      <div class="paper-header" v-if="paper.layoutConfig?.headerText">
        {{ paper.layoutConfig.headerText }}
      </div>

      <h1 class="paper-title">{{ paper.title }}</h1>
      <div class="paper-meta">
        <span v-if="paper.totalScore">满分：{{ paper.totalScore }}分</span>
        <span>学科：{{ getSubjectLabel(paper.subject) }}</span>
      </div>
      <div v-if="paper.description" class="paper-desc">{{ paper.description }}</div>

      <div class="paper-body">
        <div v-for="(q, idx) in (paper as any).questions" :key="q.id" class="question-block">
          <div class="q-header">
            <span class="q-num">{{ idx + 1 }}.</span>
            <span class="q-type">[{{ getTypeLabel(q.type) }}]</span>
            <span v-if="q.score" class="q-score">（{{ q.score }}分）</span>
          </div>
          <div class="markdown-body q-content" v-html="renderMarkdown(q.content)"></div>

          <div v-if="q.options?.length" class="q-options">
            <div v-for="(opt, oi) in q.options" :key="oi" class="q-option">
              {{ String.fromCharCode(65 + oi) }}. {{ opt }}
            </div>
          </div>

          <div v-if="shouldShowAnswerArea(q.type)" class="answer-area" :style="answerAreaStyle"></div>

          <div v-if="paper.layoutConfig?.showAnswer && q.answer" class="q-answer">
            <strong>【答案】</strong>
            <div class="markdown-body" v-html="renderMarkdown(q.answer)"></div>
          </div>
          <div v-if="paper.layoutConfig?.showAnalysis && q.analysis" class="q-analysis">
            <strong>【解析】</strong>
            <div class="markdown-body" v-html="renderMarkdown(q.analysis)"></div>
          </div>
        </div>
      </div>

      <div class="paper-footer" v-if="paper.layoutConfig?.footerText">
        {{ paper.layoutConfig.footerText }}
      </div>
    </div>
  </div>

  <div v-else class="loading">加载中...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { usePaperStore } from '@/stores/paperStore';
import { renderMarkdown } from '@/utils/markdown';
import { getSubjectLabel, getTypeLabel } from '@/utils/constants';
import type { QuestionType } from 'shared/src/index';

const route = useRoute();
const paperStore = usePaperStore();
const printArea = ref<HTMLElement>();

const paper = computed(() => paperStore.currentPaper);

const answerAreaStyle = computed(() => {
  const lines = paper.value?.layoutConfig?.answerAreaLines || 5;
  return { minHeight: `${lines * 28}px` };
});

function shouldShowAnswerArea(type: QuestionType): boolean {
  return ['fill_blank', 'short_answer', 'essay'].includes(type);
}

function handlePrint() {
  window.print();
}

onMounted(() => {
  paperStore.fetchPaper(route.params.id as string);
});
</script>

<style scoped>
.paper-print {
  background: white;
  max-width: 800px;
  margin: 0 auto;
  padding: 48px;
  box-shadow: var(--shadow-xl);
  border-radius: var(--radius-lg);
  color: #1e293b;
}

.paper-header {
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
  margin-bottom: 24px;
}

.paper-title {
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #1e293b;
}

.paper-meta {
  text-align: center;
  font-size: 14px;
  color: #64748b;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  gap: 24px;
}

.paper-desc {
  text-align: center;
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 24px;
  font-style: italic;
}

.paper-body {
  margin-top: 28px;
}

.question-block {
  margin-bottom: 28px;
  page-break-inside: avoid;
}

.q-header {
  margin-bottom: 8px;
  font-weight: 600;
}

.q-num {
  font-size: 16px;
  margin-right: 4px;
  color: #1e293b;
}

.q-type {
  font-size: 12px;
  color: #94a3b8;
  margin-right: 4px;
}

.q-score {
  font-size: 12px;
  color: #6366f1;
}

.q-content {
  margin-bottom: 8px;
}

.q-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 20px;
  margin: 10px 0;
  padding-left: 24px;
}

.q-option {
  font-size: 14px;
  padding: 4px 0;
  color: #334155;
}

.answer-area {
  border-bottom: 1px dashed #cbd5e1;
  margin: 10px 0;
}

.q-answer {
  margin-top: 10px;
  padding: 10px 14px;
  background: #f0fdf4;
  border-radius: var(--radius);
  border-left: 3px solid #10b981;
  font-size: 13px;
}

.q-analysis {
  margin-top: 10px;
  padding: 10px 14px;
  background: #eef2ff;
  border-radius: var(--radius);
  border-left: 3px solid #6366f1;
  font-size: 13px;
}

.paper-footer {
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
  margin-top: 36px;
}

@media print {
  .paper-print {
    box-shadow: none;
    padding: 0;
    max-width: 100%;
  }

  .answer-area {
    border-bottom: 1px solid #999;
  }

  .question-block {
    page-break-inside: avoid;
  }
}
</style>
