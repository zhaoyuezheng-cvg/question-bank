<template>
  <div>
    <h1 style="margin-bottom: 24px;">📊 仪表盘</h1>

    <div class="stats-grid">
      <div class="card stat-card" v-for="s in stats" :key="s.label">
        <div class="stat-icon">{{ s.icon }}</div>
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <div class="card" style="margin-top: 24px;">
      <div class="card-header">
        <span class="card-title">学科分布</span>
      </div>
      <div class="subject-bars">
        <div v-for="item in subjectStats" :key="item.subject" class="bar-item">
          <span class="bar-label">{{ getSubjectLabel(item.subject as Subject) }}</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: item.pct + '%', background: SUBJECT_COLORS[item.subject as Subject] }"></div>
          </div>
          <span class="bar-count">{{ item.count }}</span>
        </div>
      </div>
    </div>

    <div class="btn-group" style="margin-top: 24px;">
      <router-link to="/questions/new" class="btn btn-primary">➕ 新建题目</router-link>
      <router-link to="/papers/new" class="btn">📄 新建试卷</router-link>
      <router-link to="/import" class="btn">📥 批量导入</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getSubjectLabel, SUBJECT_COLORS } from '@/utils/constants';
import type { Subject } from 'shared/src/index';

const stats = ref([
  { icon: '📝', label: '题目总数', value: 0 },
  { icon: '📄', label: '试卷数量', value: 0 },
  { icon: '🎯', label: '已答题数', value: 0 },
  { icon: '📊', label: '正确率', value: '0%' },
]);

const subjectStats = ref<{ subject: string; count: number; pct: number }[]>([]);

onMounted(async () => {
  try {
    const [qRes, pRes, tRes] = await Promise.all([
      fetch('/api/questions?pageSize=1'),
      fetch('/api/papers?pageSize=1'),
      fetch('/api/tags'),
    ]);
    const qJson = await qRes.json();
    const pJson = await pRes.json();
    const tJson = await tRes.json();

    stats.value[0].value = qJson.data?.total || 0;
    stats.value[1].value = pJson.data?.total || 0;

    // Fetch practice stats
    try {
      const psRes = await fetch('/api/practice/stats');
      const psJson = await psRes.json();
      if (psJson.success) {
        stats.value[2].value = psJson.data.totalAnswered;
        stats.value[3].value = psJson.data.accuracy + '%';
      }
    } catch {}

    // Fetch subject distribution from stats API
    try {
      const statsRes = await fetch('/api/questions/stats/summary');
      const statsJson = await statsRes.json();
      if (statsJson.success) {
        const max = Math.max(...statsJson.data.bySubject.map((s: any) => s._count), 1);
        subjectStats.value = statsJson.data.bySubject
          .map((s: any) => ({ subject: s.subject, count: s._count, pct: (s._count / max) * 100 }))
          .sort((a: any, b: any) => b.count - a.count);
      }
    } catch {
      // fallback
    }
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  text-align: center;
  padding: 24px;
}

.stat-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.subject-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  width: 48px;
  font-size: 13px;
  text-align: right;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 20px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bar-count {
  width: 32px;
  font-size: 13px;
  font-weight: 600;
}
</style>
