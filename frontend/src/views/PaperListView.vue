<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📄</span>
        试卷管理
      </h1>
      <router-link to="/papers/new" class="btn btn-primary">➕ 新建试卷</router-link>
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
</template>

<script setup lang="ts">
import { onMounted, inject } from 'vue';
import { usePaperStore } from '@/stores/paperStore';
import { getSubjectLabel } from '@/utils/constants';

const store = usePaperStore();
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
