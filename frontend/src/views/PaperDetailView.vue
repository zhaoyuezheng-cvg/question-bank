<template>
  <div v-if="paper">
    <div class="no-print" style="margin-bottom: 16px;">
      <div class="btn-group">
        <router-link to="/papers" class="btn">← 返回列表</router-link>
        <router-link :to="`/papers/${paper.id}/edit`" class="btn">✏️ 编辑</router-link>
        <button class="btn" @click="handlePrint">🖨️ 打印</button>
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
        <div v-for="(q, idx) in paper.questions" :key="q.id" class="question-block">
          <div class="q-header">
            <span class="q-num">{{ idx + 1 }}.</span>
            <span class="q-type">[{{ getTypeLabel(q.type) }}]</span>
            <span v-if="q.score" class="q-score">（{{ q.score }}分）</span>
          </div>
          <div class="markdown-body q-content" v-html="renderMarkdown(q.content)"></div>

          <!-- Options for choice questions -->
          <div v-if="q.options?.length" class="q-options">
            <div v-for="(opt, oi) in q.options" :key="oi" class="q-option">
              {{ String.fromCharCode(65 + oi) }}. {{ opt }}
            </div>
          </div>

          <!-- Answer area -->
          <div v-if="shouldShowAnswerArea(q.type)" class="answer-area" :style="answerAreaStyle"></div>

          <!-- Answer & Analysis (if configured) -->
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
  padding: 40px;
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius);
}

.paper-header {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
  margin-bottom: 20px;
}

.paper-title {
  text-align: center;
  font-size: 22px;
  margin-bottom: 8px;
}

.paper-meta {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.paper-desc {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.paper-body {
  margin-top: 24px;
}

.question-block {
  margin-bottom: 24px;
  page-break-inside: avoid;
}

.q-header {
  margin-bottom: 8px;
  font-weight: 600;
}

.q-num {
  font-size: 16px;
  margin-right: 4px;
}

.q-type {
  font-size: 12px;
  color: var(--text-muted);
  margin-right: 4px;
}

.q-score {
  font-size: 12px;
  color: var(--primary);
}

.q-content {
  margin-bottom: 8px;
}

.q-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
  margin: 8px 0;
  padding-left: 20px;
}

.q-option {
  font-size: 14px;
  padding: 2px 0;
}

.answer-area {
  border-bottom: 1px dashed #ccc;
  margin: 8px 0;
}

.q-answer {
  margin-top: 8px;
  padding: 8px 12px;
  background: #f0fdf4;
  border-radius: var(--radius);
  border-left: 3px solid var(--success);
  font-size: 13px;
}

.q-analysis {
  margin-top: 8px;
  padding: 8px 12px;
  background: #eef2ff;
  border-radius: var(--radius);
  border-left: 3px solid var(--primary);
  font-size: 13px;
}

.paper-footer {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 8px;
  margin-top: 32px;
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
