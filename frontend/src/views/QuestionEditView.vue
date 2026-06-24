<template>
  <div>
    <h1 style="margin-bottom: 16px;">{{ isEdit ? '✏️ 编辑题目' : '➕ 新建题目' }}</h1>

    <div class="edit-layout">
      <!-- Left: Form -->
      <div class="card">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">学科 *</label>
            <select class="form-select" v-model="form.subject">
              <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">题型 *</label>
            <select class="form-select" v-model="form.type">
              <option v-for="(label, key) in QUESTION_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">难度 *</label>
            <select class="form-select" v-model.number="form.difficulty">
              <option v-for="n in 5" :key="n" :value="n">{{ DIFFICULTY_LABELS[n as Difficulty] }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">一级分类</label>
            <input class="form-input" v-model="form.category" placeholder="如：古诗词" />
          </div>
          <div class="form-group">
            <label class="form-label">二级分类</label>
            <input class="form-input" v-model="form.subCategory" placeholder="如：炼字" />
          </div>
          <div class="form-group">
            <label class="form-label">来源</label>
            <input class="form-input" v-model="form.source" placeholder="如：2024全国甲卷" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">题干 *（支持 Markdown + LaTeX）</label>
          <textarea class="form-textarea" v-model="form.content" rows="6" placeholder="输入题干内容...&#10;&#10;LaTeX公式: $E=mc^2$&#10;下划线: ==重点内容==&#10;填空: ___"></textarea>
        </div>

        <div class="form-group" v-if="isChoiceType">
          <label class="form-label">选项（每行一个）</label>
          <textarea class="form-textarea" v-model="optionsText" rows="4" placeholder="A. 选项一&#10;B. 选项二&#10;C. 选项三&#10;D. 选项四"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">标准答案 *</label>
          <textarea class="form-textarea" v-model="form.answer" rows="3" placeholder="输入标准答案..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">解析</label>
          <textarea class="form-textarea" v-model="form.analysis" rows="3" placeholder="输入解题思路与解析..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">标签</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
            <span class="tag tag-removable" v-for="t in form.tags" :key="t" @click="removeTag(t)">
              {{ t }} ×
            </span>
          </div>
          <div style="display: flex; gap: 8px;">
            <input class="form-input" v-model="newTag" placeholder="输入标签" @keyup.enter="addTag" style="flex:1;" />
            <button class="btn" @click="addTag">添加</button>
          </div>
        </div>

        <div class="btn-group" style="margin-top: 20px;">
          <button class="btn btn-primary" @click="handleSave" :disabled="saving">
            {{ saving ? '保存中...' : '💾 保存' }}
          </button>
          <router-link to="/questions" class="btn">取消</router-link>
        </div>
      </div>

      <!-- Right: Preview -->
      <div class="card preview-panel">
        <div class="card-header">
          <span class="card-title">实时预览</span>
        </div>
        <div class="markdown-body" v-html="previewContent"></div>
        <div v-if="form.answer" style="margin-top: 16px;">
          <strong style="color: var(--success);">答案：</strong>
          <div class="markdown-body" v-html="previewAnswer"></div>
        </div>
        <div v-if="form.analysis" style="margin-top: 16px;">
          <strong style="color: var(--primary);">解析：</strong>
          <div class="markdown-body" v-html="previewAnalysis"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuestionStore } from '@/stores/questionStore';
import { renderMarkdown } from '@/utils/markdown';
import {
  SUBJECT_LABELS, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS,
} from '@/utils/constants';
import type { QuestionType, Subject, Difficulty } from 'shared/src/index';

const route = useRoute();
const router = useRouter();
const store = useQuestionStore();

const isEdit = computed(() => !!route.params.id);
const saving = ref(false);
const newTag = ref('');
const optionsText = ref('');

const form = ref({
  subject: 'chinese' as Subject,
  category: '',
  subCategory: '',
  type: 'short_answer' as QuestionType,
  difficulty: 3 as Difficulty,
  content: '',
  answer: '',
  analysis: '',
  tags: [] as string[],
  source: '',
});

const isChoiceType = computed(() =>
  ['choice', 'multi_choice'].includes(form.value.type)
);

const previewContent = computed(() => renderMarkdown(form.value.content));
const previewAnswer = computed(() => renderMarkdown(form.value.answer));
const previewAnalysis = computed(() => renderMarkdown(form.value.analysis));

function addTag() {
  const t = newTag.value.trim();
  if (t && !form.value.tags.includes(t)) {
    form.value.tags.push(t);
  }
  newTag.value = '';
}

function removeTag(t: string) {
  form.value.tags = form.value.tags.filter(tag => tag !== t);
}

async function handleSave() {
  if (!form.value.content.trim() || !form.value.answer.trim()) {
    alert('题干和答案不能为空');
    return;
  }

  saving.value = true;
  try {
    const data: any = {
      ...form.value,
      options: isChoiceType.value
        ? optionsText.value.split('\n').map(s => s.replace(/^[A-D][.、．)\s]+/, '').trim()).filter(Boolean)
        : undefined,
    };

    let res;
    if (isEdit.value) {
      res = await store.updateQuestion(route.params.id as string, data);
    } else {
      res = await store.createQuestion(data);
    }

    if (res.success) {
      router.push('/questions');
    } else {
      alert('保存失败: ' + (res.error || '未知错误'));
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  if (isEdit.value) {
    const q = await store.fetchQuestion(route.params.id as string);
    if (q) {
      form.value = {
        subject: q.subject,
        category: q.category,
        subCategory: q.subCategory,
        type: q.type,
        difficulty: q.difficulty,
        content: q.content,
        answer: q.answer,
        analysis: q.analysis,
        tags: q.tags || [],
        source: q.source || '',
      };
      if (q.options) {
        optionsText.value = q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n');
      }
    }
  }
});
</script>

<style scoped>
.edit-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.preview-panel {
  position: sticky;
  top: 24px;
}

@media (max-width: 1024px) {
  .edit-layout {
    grid-template-columns: 1fr;
  }
  .preview-panel {
    position: static;
  }
}
</style>
