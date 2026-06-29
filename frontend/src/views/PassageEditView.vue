<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">{{ isEdit ? '✏️' : '➕' }}</span>
        {{ isEdit ? '编辑阅读材料' : '新建阅读材料' }}
      </h1>
      <div class="btn-group">
        <button class="btn btn-primary" @click="savePassage" :disabled="saving">
          {{ saving ? '保存中...' : '💾 保存材料' }}
        </button>
        <router-link to="/passages" class="btn">取消</router-link>
      </div>
    </div>

    <!-- Passage Form -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📖 阅读材料信息</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">学科 *</label>
          <select class="form-select" v-model="form.subject">
            <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">一级分类</label>
          <select class="form-select" v-model="form.category">
            <option value="">选择分类</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">二级分类</label>
          <select class="form-select" v-model="form.subCategory">
            <option value="">选择子分类</option>
            <option v-for="c in subCategories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">材料标题 *</label>
        <input class="form-input" v-model="form.title" placeholder="如：《背影》阅读理解" />
      </div>
      <div class="form-group">
        <label class="form-label">来源</label>
        <input class="form-input" v-model="form.source" placeholder="如：2024全国甲卷" />
      </div>
      <div class="form-group">
        <label class="form-label">
          文章正文 *（支持 Markdown + LaTeX）
          <button class="btn btn-sm btn-ghost" style="float: right;" @click="triggerImageUpload">🖼️ 插入图片</button>
        </label>
        <div class="edit-layout">
          <textarea class="form-textarea" v-model="form.content" rows="15" placeholder="粘贴或输入文章正文..."></textarea>
          <div class="preview-panel">
            <div class="preview-label">👁️ 预览</div>
            <div class="markdown-body preview-content" v-html="previewContent"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub Questions -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">📝 子题列表 ({{ questions.length }})</span>
        <button class="btn btn-sm btn-primary" @click="addQuestion">➕ 添加子题</button>
      </div>

      <div v-if="!questions.length" class="empty-state" style="padding: 24px;">
        <p>还没有子题，点击上方按钮添加</p>
      </div>

      <div v-for="(q, idx) in questions" :key="idx" class="sub-question-card">
        <div class="sub-q-header">
          <span class="sub-q-num">第 {{ idx + 1 }} 题</span>
          <select class="form-select" v-model="q.type" style="width: 100px;">
            <option v-for="(label, key) in QUESTION_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
          <select class="form-select" v-model="q.subType" style="width: 140px;">
            <option value="">细分题型</option>
            <option v-for="st in availableSubTypes" :key="st" :value="st">{{ getSubTypeLabel(st) }}</option>
          </select>
          <select class="form-select" v-model.number="q.difficulty" style="width: 80px;">
            <option v-for="n in 5" :key="n" :value="n">{{ DIFFICULTY_LABELS[n as Difficulty] }}</option>
          </select>
          <input class="form-input" v-model.number="q.score" type="number" placeholder="分值" style="width: 70px;" />
          <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="removeQuestion(idx)">🗑️</button>
        </div>
        <div class="form-group" style="margin-top: 8px;">
          <textarea class="form-textarea" v-model="q.content" rows="3" placeholder="题目内容..."></textarea>
        </div>
        <div v-if="isChoiceType(q.type)" class="form-group">
          <textarea class="form-textarea" v-model="q.optionsText" rows="3" placeholder="选项（每行一个）：&#10;A. 选项一&#10;B. 选项二"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex: 1;">
            <label class="form-label">答案</label>
            <textarea class="form-textarea" v-model="q.answer" rows="2" placeholder="标准答案"></textarea>
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="form-label">解析</label>
            <textarea class="form-textarea" v-model="q.analysis" rows="2" placeholder="解题解析"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden file input -->
    <input ref="fileInput" type="file" accept="image/*" style="display:none;" @change="handleImageUpload" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { renderMarkdown } from '@/utils/markdown';
import {
  SUBJECT_LABELS, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS,
  getSubTypeLabel, getSubTypesForSubject,
} from '@/utils/constants';
import type { Difficulty } from 'shared/src/index';
import { apiGet, apiPost, apiPut, apiUpload } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const toast = inject<(type: string, msg: string) => void>('toast')!;

const isEdit = computed(() => !!route.params.id);
const saving = ref(false);
const fileInput = ref<HTMLInputElement>();

const form = ref({
  title: '',
  subject: 'chinese' as string,
  category: '',
  subCategory: '',
  content: '',
  source: '',
});

interface SubQuestion {
  type: string;
  subType: string;
  difficulty: number;
  content: string;
  optionsText: string;
  answer: string;
  analysis: string;
  score: number;
  existingId?: string;
}

const questions = ref<SubQuestion[]>([]);

// Category tree data
const categoryTree = ref<Record<string, any>>({});

const categories = computed(() => {
  const tree = categoryTree.value[form.value.subject];
  return tree?.children?.map((c: any) => c.name) || [];
});

const subCategories = computed(() => {
  const tree = categoryTree.value[form.value.subject];
  const cat = tree?.children?.find((c: any) => c.name === form.value.category);
  return cat?.children?.map((c: any) => c.name) || [];
});

const availableSubTypes = computed(() => getSubTypesForSubject(form.value.subject));

const previewContent = computed(() => renderMarkdown(form.value.content));

function isChoiceType(type: string) {
  return ['choice', 'multi_choice'].includes(type);
}

function addQuestion() {
  questions.value.push({
    type: 'short_answer',
    subType: '',
    difficulty: 3,
    content: '',
    optionsText: '',
    answer: '',
    analysis: '',
    score: 0,
  });
}

function removeQuestion(idx: number) {
  questions.value.splice(idx, 1);
}

function triggerImageUpload() {
  fileInput.value?.click();
}

async function handleImageUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('image', file);
  const json = await apiUpload('/upload', formData);
  if (json.success) {
    form.value.content += `\n![图片](${json.data.url})`;
    toast('success', '图片已上传');
  }
  (e.target as HTMLInputElement).value = '';
}

async function savePassage() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    toast('error', '标题和文章内容不能为空');
    return;
  }

  saving.value = true;
  try {
    // Save passage
    const passageData = { ...form.value };
    let passageId: string;

    if (isEdit.value) {
      const json = await apiPut(`/passages/${route.params.id}`, passageData);
      if (!json.success) { toast('error', '保存失败'); return; }
      passageId = json.data.id;
    } else {
      const json = await apiPost('/passages', passageData);
      if (!json.success) { toast('error', '创建失败'); return; }
      passageId = json.data.id;
    }

    // Save sub-questions
    let savedCount = 0;
    for (const q of questions.value) {
      if (!q.content.trim() || !q.answer.trim()) continue;

      const qData: any = {
        subject: form.value.subject,
        category: form.value.category,
        subCategory: form.value.subCategory,
        type: q.type,
        subType: q.subType || null,
        difficulty: q.difficulty,
        content: q.content,
        answer: q.answer,
        analysis: q.analysis,
        passageId,
        score: q.score || undefined,
      };

      if (isChoiceType(q.type) && q.optionsText) {
        qData.options = q.optionsText.split('\n').map(s => s.replace(/^[A-D][.、．)\s]+/, '').trim()).filter(Boolean);
      }

      if (q.existingId) {
        await apiPut(`/questions/${q.existingId}`, qData);
      } else {
        await apiPost('/questions', qData);
      }
      savedCount++;
    }

    toast('success', `已保存材料 + ${savedCount} 道子题`);
    router.push('/passages');
  } finally {
    saving.value = false;
  }
}

async function loadCategoryTree() {
  const json = await apiGet('/passages/categories/tree');
  if (json.success) categoryTree.value = json.data;
}

onMounted(async () => {
  await loadCategoryTree();

  if (isEdit.value) {
    const json = await apiGet(`/passages/${route.params.id}`);
    if (json.success) {
      const p = json.data;
      form.value = {
        title: p.title,
        subject: p.subject,
        category: p.category,
        subCategory: p.subCategory,
        content: p.content,
        source: p.source || '',
      };
      questions.value = (p.questions || []).map((q: any) => ({
        type: q.type,
        subType: q.subType || '',
        difficulty: q.difficulty,
        content: q.content,
        optionsText: q.options ? q.options.map((o: string, i: number) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n') : '',
        answer: q.answer,
        analysis: q.analysis || '',
        score: 0,
        existingId: q.id,
      }));
    }
  }
});
</script>

<style scoped>
.edit-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.preview-panel {
  background: var(--bg); border-radius: var(--radius); padding: 16px;
  overflow-y: auto; max-height: 400px;
}
.preview-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px;
}
.preview-content { font-size: 14px; line-height: 1.8; }

.sub-question-card {
  border: 1px solid var(--border); border-radius: var(--radius);
  padding: 16px; margin-bottom: 12px; background: var(--bg);
}
.sub-q-header {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.sub-q-num {
  font-weight: 700; color: var(--primary); font-size: 14px; min-width: 60px;
}

@media (max-width: 768px) {
  .edit-layout { grid-template-columns: 1fr; }
  .sub-q-header { flex-direction: column; align-items: stretch; }
  .sub-q-header .form-select, .sub-q-header .form-input { width: 100% !important; }
}
</style>
