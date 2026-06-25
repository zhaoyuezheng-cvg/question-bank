<template>
  <div class="popover-trigger" @mouseenter="show" @mouseleave="hide">
    <slot />
    <Teleport to="body">
      <Transition name="popover">
        <div
          v-if="visible && question"
          class="popover-card"
          :style="popStyle"
          @mouseenter="keepOpen"
          @mouseleave="hide"
        >
          <div class="popover-header">
            <span class="tag" :style="{ background: subjectColor + '18', color: subjectColor }">{{ subjectLabel }}</span>
            <span class="tag">{{ typeLabel }}</span>
            <span class="diff-badge" :style="{ background: diffColor }">{{ diffLabel }}</span>
          </div>
          <div class="popover-body markdown-body" v-html="rendered"></div>
          <div v-if="question.answer" class="popover-answer">
            <strong>答案：</strong>{{ question.answer.slice(0, 100) }}
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import {
  SUBJECT_LABELS, SUBJECT_COLORS, QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS, DIFFICULTY_COLORS,
  getSubjectLabel, getTypeLabel, getDifficultyLabel,
} from '@/utils/constants';
import type { Subject, QuestionType, Difficulty } from 'shared/src/index';

const props = defineProps<{
  question: {
    subject: Subject;
    type: QuestionType;
    difficulty: Difficulty;
    content: string;
    answer?: string;
  } | null;
}>();

const visible = ref(false);
const popStyle = ref<Record<string, string>>({});
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const subjectLabel = computed(() => props.question ? getSubjectLabel(props.question.subject) : '');
const subjectColor = computed(() => props.question ? SUBJECT_COLORS[props.question.subject] : '');
const typeLabel = computed(() => props.question ? getTypeLabel(props.question.type) : '');
const diffLabel = computed(() => props.question ? getDifficultyLabel(props.question.difficulty) : '');
const diffColor = computed(() => props.question ? DIFFICULTY_COLORS[props.question.difficulty] : '');
const rendered = computed(() => props.question ? renderMarkdown(props.question.content.slice(0, 300)) : '');

function show(e: MouseEvent) {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  popStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    left: `${Math.min(rect.left, window.innerWidth - 420)}px`,
    zIndex: '9999',
  };
  visible.value = true;
}

function hide() {
  hideTimer = setTimeout(() => { visible.value = false; }, 200);
}

function keepOpen() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
}
</script>

<style scoped>
.popover-trigger {
  display: contents;
}

.popover-card {
  width: 400px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border);
  padding: 16px;
}

.popover-header {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.popover-body {
  font-size: 14px;
  line-height: 1.6;
  max-height: 160px;
  overflow: hidden;
}

.popover-answer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
  font-size: 13px;
  color: var(--text-secondary);
}

.popover-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.popover-leave-active { transition: opacity 0.1s ease; }
.popover-enter-from { opacity: 0; transform: translateY(-4px); }
.popover-leave-to { opacity: 0; }
</style>
