<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📄</span>
        试卷管理
      </h1>
      <div class="btn-group">
        <button class="btn" @click="showAutoModal = true">🤖 自动组卷</button>
        <router-link to="/papers/new" class="btn btn-primary">➕ 新建试卷</router-link>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow: hidden;">
      <div v-if="store.loading" style="padding: 20px;">
        <div v-for="n in 4" :key="n" class="skeleton-row">
          <div class="skeleton skeleton-line" style="flex: 2; height: 16px;"></div>
          <div class="skeleton skeleton-line" style="width: 60px; height: 16px;"></div>
          <div class="skeleton skeleton-line" style="width: 50px; height: 16px;"></div>
          <div class="skeleton skeleton-line" style="width: 50px; height: 16px;"></div>
          <div class="skeleton skeleton-line" style="width: 120px; height: 16px;"></div>
          <div class="skeleton skeleton-line" style="width: 120px; height: 16px;"></div>
        </div>
      </div>

      <div v-else-if="!store.papers.length" class="empty-state">
        <div class="empty-state-icon">📄</div>
        <p>暂无试卷，点击右上角「新建试卷」开始组卷</p>
        <router-link to="/papers/new" class="btn btn-primary" style="margin-top: 16px;">➕ 新建试卷</router-link>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>试卷名称</th>
            <th style="width: 80px;">学科</th>
            <th style="width: 70px;">题数</th>
            <th style="width: 70px;">总分</th>
            <th style="width: 160px;">创建时间</th>
            <th style="width: 160px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in store.papers" :key="p.id">
            <td>
              <div style="font-weight: 600;">{{ p.title }}</div>
              <div v-if="p.description" style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">{{ p.description }}</div>
            </td>
            <td>
              <span class="tag">{{ getSubjectLabel(p.subject) }}</span>
            </td>
            <td style="font-weight: 600;">{{ (p as any).questions?.length || 0 }}</td>
            <td style="font-weight: 600;">{{ p.totalScore || '-' }}</td>
            <td style="font-size: 13px; color: var(--text-secondary);">{{ formatDate(p.createdAt) }}</td>
            <td>
              <div class="btn-group">
                <router-link :to="`/papers/${p.id}`" class="btn btn-sm btn-ghost">👁️ 查看</router-link>
                <router-link :to="`/papers/${p.id}/edit`" class="btn btn-sm btn-ghost">✏️ 编辑</router-link>
                <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="handleDelete(p.id)">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
    <!-- 自动组卷 Modal -->
    <div v-if="showAutoModal" class="modal-overlay" @click.self="showAutoModal = false">
      <div class="modal">
        <div class="modal-title">🤖 自动组卷</div>
        <div class="form-group">
          <label class="form-label">学科</label>
          <select class="form-select" v-model="autoForm.subject">
            <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">试卷名称</label>
          <input class="form-input" v-model="autoForm.title" placeholder="留空自动生成" />
        </div>
        <div class="form-group">
          <label class="form-label">总分</label>
          <input class="form-input" type="number" v-model.number="autoForm.totalScore" />
        </div>
        <div class="form-group">
          <label class="form-label">组卷规则</label>
          <div v-for="(rule, i) in autoForm.rules" :key="i" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
            <select class="form-select" v-model="rule.type" style="flex: 1;">
              <option value="">任意题型</option>
              <option v-for="(label, key) in QUESTION_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
            <select class="form-select" v-model="rule.difficulty" style="width: 100px;">
              <option value="0">任意难度</option>
              <option v-for="n in 5" :key="n" :value="n">{{ DIFFICULTY_LABELS[n as Difficulty] }}</option>
            </select>
            <input class="form-input" type="number" v-model.number="rule.count" min="1" max="50" style="width: 70px;" placeholder="题数" />
            <span style="font-size: 12px; color: var(--text-muted);">题</span>
            <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="autoForm.rules.splice(i, 1)">✕</button>
          </div>
          <button class="btn btn-sm" @click="autoForm.rules.push({ type: '', difficulty: 0, count: 5 })">+ 添加规则</button>
        </div>
        <div class="btn-group" style="margin-top: 20px; justify-content: flex-end;">
          <button class="btn" @click="showAutoModal = false">取消</button>
          <button class="btn btn-primary" @click="handleAutoGenerate" :disabled="autoGenerating">{{ autoGenerating ? '生成中...' : '🚀 生成试卷' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { usePaperStore } from '@/stores/paperStore';
import { getSubjectLabel, SUBJECT_LABELS, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '@/utils/constants';
import type { Difficulty } from 'shared/src/index';
import { apiPost } from '@/utils/api';

const store = usePaperStore();
const router = useRouter();
const toast = inject<(type: string, msg: string) => void>('toast')!;
const confirmFn = inject<(opts: any) => Promise<boolean>>('confirm')!;

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString('zh-CN');
}

async function handleDelete(id: string) {
  const ok = await confirmFn({ message: '确定删除此试卷？删除后不可恢复。', icon: '🗑️' });
  if (!ok) return;
  await store.deletePaper(id);
  toast('success', '试卷已删除');
}

const showAutoModal = ref(false);
const autoGenerating = ref(false);
const autoForm = ref({
  subject: 'chinese',
  title: '',
  totalScore: 100,
  rules: [
    { type: 'choice', difficulty: 0, count: 10 },
    { type: 'fill_blank', difficulty: 0, count: 5 },
    { type: 'short_answer', difficulty: 0, count: 3 },
  ],
});

async function handleAutoGenerate() {
  if (!autoForm.value.rules.length) { toast('error', '请添加组卷规则'); return; }
  autoGenerating.value = true;
  try {
    const json = await apiPost('/papers/auto-generate', {
      subject: autoForm.value.subject,
      title: autoForm.value.title || undefined,
      totalScore: autoForm.value.totalScore,
      rules: autoForm.value.rules.filter(r => r.count > 0),
    });
    if (json.success) {
      toast('success', `已生成「${json.data.title}」，共 ${json.data.questionCount} 题`);
      showAutoModal.value = false;
      store.fetchPapers();
      router.push(`/papers/${json.data.paperId}`);
    } else {
      toast('error', json.error || '组卷失败');
    }
  } catch {
    toast('error', '组卷失败');
  } finally {
    autoGenerating.value = false;
  }
}

onMounted(() => store.fetchPapers());
</script>

<style scoped>
.skeleton-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--border-light);
}
</style>
