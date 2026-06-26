<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">{{ isEdit ? '✏️' : '➕' }}</span>
        {{ isEdit ? '编辑题目' : '新建题目' }}
        <span v-if="autoSaved" class="auto-save-badge">💾 已自动保存</span>
      </h1>
      <div class="btn-group">
        <button class="btn btn-primary" @click="handleSave" :disabled="saving">
          {{ saving ? '保存中...' : '💾 保存' }}
        </button>
        <router-link to="/questions" class="btn">取消</router-link>
      </div>
    </div>

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
            <label class="form-label">细分题型（阅读理解）</label>
            <select class="form-select" v-model="form.subType">
              <option value="">无</option>
              <option v-for="st in availableSubTypes" :key="st" :value="st">{{ getSubTypeLabel(st) }}</option>
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
          <label class="form-label">
            题干 *（支持 Markdown + LaTeX）
            <button class="btn btn-sm btn-ghost" style="float: right;" @click="triggerImageUpload('content')">🖼️ 插入图片</button>
          </label>
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
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
            <span class="tag tag-removable" v-for="t in form.tags" :key="t" @click="removeTag(t)">
              {{ t }} ×
            </span>
          </div>
          <div style="display: flex; gap: 8px;">
            <input class="form-input" v-model="newTag" placeholder="输入标签后回车" @keyup.enter="addTag" style="flex:1;" />
            <button class="btn" @click="addTag">添加</button>
          </div>
        </div>
      </div>

      <!-- Right: Preview -->
      <div class="card preview-panel">
        <div class="card-header">
          <span class="card-title">👁️ 实时预览</span>
        </div>
        <div class="preview-section">
          <div class="markdown-body" v-html="previewContent"></div>
        </div>
        <div v-if="form.answer" class="preview-section" style="margin-top: 16px;">
          <div class="preview-label" style="color: var(--success);">答案</div>
          <div class="markdown-body" v-html="previewAnswer"></div>
        </div>
        <div v-if="form.analysis" class="preview-section" style="margin-top: 16px;">
          <div class="preview-label" style="color: var(--primary);">解析</div>
          <div class="markdown-body" v-html="previewAnalysis"></div>
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
import { useQuestionStore } from '@/stores/questionStore';
import { renderMarkdown } from '@/utils/markdown';
import { useAutoSave } from '@/composables/useAutoSave';
import {
  SUBJECT_LABELS, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS,
  getSubTypesForSubject, getSubTypeLabel,
} from '@/utils/constants';
import type { QuestionType, Subject, Difficulty } from 'shared/src/index';

const route = useRoute();
const router = useRouter();
const store = useQuestionStore();
const toast = inject<(type: string, msg: string, duration?: number, action?: any) => void>('toast')!;

const isEdit = computed(() => !!route.params.id);
const saving = ref(false);
const newTag = ref('');
const optionsText = ref('');
const fileInput = ref<HTMLInputElement>();
const autoSaved = ref(false);
let uploadTarget = 'content';

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
  subType: '',
});

const availableSubTypes = computed(() => getSubTypesForSubject(form.value.subject));

// Auto-save
const draftKey = computed(() => isEdit.value ? `edit-${route.params.id}` : 'new');
const { hasDraft, load: loadDraft, clear: clearDraft } = useAutoSave(draftKey.value, form, 5000);

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

// Image upload
function triggerImageUpload(target: string) {
  uploadTarget = target;
  fileInput.value?.click();
}

async function handleImageUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();
    if (json.success) {
      const md = `![图片](${json.data.url})`;
      if (uploadTarget === 'content') {
        form.value.content += '\n' + md;
      } else if (uploadTarget === 'answer') {
        form.value.answer += '\n' + md;
      }
      toast('success', '图片已上传');
    } else {
      toast('error', '上传失败: ' + (json.error || ''));
    }
  } catch {
    toast('error', '上传失败');
  }
  // Reset input
  (e.target as HTMLInputElement).value = '';
}

async function handleSave() {
  if (!form.value.content.trim() || !form.value.answer.trim()) {
    toast('error', '题干和答案不能为空');
    return;
  }

  saving.value = true;
  try {
    const data: any = {
      ...form.value,
      options: isChoiceType.value
        ? optionsText.value.split('\n').map((s: string) => s.replace(/^[A-D][.、．)\s]+/, '').trim()).filter(Boolean)
        : undefined,
    };

    let res;
    if (isEdit.value) {
      res = await store.updateQuestion(route.params.id as string, data);
    } else {
      res = await store.createQuestion(data);
    }

    if (res.success) {
      clearDraft();
      toast('success', isEdit.value ? '题目已更新' : '题目已创建');
      router.push('/questions');
    } else {
      toast('error', '保存失败: ' + (res.error || '未知错误'));
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  // Check for clone mode
  const cloneId = route.query.clone as string;
  if (cloneId) {
    const q = await store.fetchQuestion(cloneId);
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
        subType: q.subType || '',
      };
      if (q.options) {
        optionsText.value = q.options.map((o: string, i: number) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n');
      }
      toast('success', '已加载题目内容，请修改后保存为新题');
    }
    return;
  }

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
        subType: q.subType || '',
      };
      if (q.options) {
        optionsText.value = q.options.map((o: string, i: number) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n');
      }
    }
  } else {
    // Check for draft
    const draft = loadDraft();
    if (draft && draft.content) {
      form.value = { ...form.value, ...draft };
      autoSaved.value = true;
      setTimeout(() => { autoSaved.value = false; }, 3000);
    }
  }
});
</script>

<style scoped>
.edit-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.preview-panel {
  position: sticky;
  top: 28px;
}

.preview-section {
  padding: 16px;
  background: var(--bg);
  border-radius: var(--radius);
  min-height: 60px;
}

.preview-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.auto-save-badge {
  font-size: 12px;
  font-weight: 500;
  color: var(--success);
  margin-left: 12px;
  animation: fadeIn 0.3s ease;
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
