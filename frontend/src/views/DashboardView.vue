<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📊</span>
        仪表盘
      </h1>
      <div class="btn-group">
        <router-link to="/questions/new" class="btn btn-primary">➕ 新建题目</router-link>
        <router-link to="/papers/new" class="btn">📄 新建试卷</router-link>
        <router-link to="/import" class="btn">📥 批量导入</router-link>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card" :style="{ background: s.gradient }">
        <div class="stat-icon-wrap">
          <span class="stat-icon">{{ s.icon }}</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <!-- Subject Pie -->
      <div class="card chart-card">
        <div class="card-header">
          <span class="card-title">📈 学科分布</span>
        </div>
        <div ref="pieChartRef" class="chart-container"></div>
      </div>

      <!-- Difficulty Bar -->
      <div class="card chart-card">
        <div class="card-header">
          <span class="card-title">📊 难度分布</span>
        </div>
        <div ref="barChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- Type distribution -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">📋 题型分布</span>
      </div>
      <div ref="typeChartRef" class="chart-container" style="height: 200px;"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { getSubjectLabel, SUBJECT_COLORS, DIFFICULTY_LABELS, DIFFICULTY_COLORS, QUESTION_TYPE_LABELS } from '@/utils/constants';
import type { Subject, Difficulty, QuestionType } from 'shared/src/index';

const pieChartRef = ref<HTMLElement>();
const barChartRef = ref<HTMLElement>();
const typeChartRef = ref<HTMLElement>();

const stats = ref([
  { icon: '📝', label: '题目总数', value: 0, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { icon: '📄', label: '试卷数量', value: 0, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { icon: '🎯', label: '已答题数', value: 0, gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { icon: '📊', label: '正确率', value: '0%', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
]);

let statsData: any = null;

function initCharts() {
  if (!statsData) return;

  // Pie chart - Subject distribution
  if (pieChartRef.value) {
    const pie = echarts.init(pieChartRef.value);
    const pieData = statsData.bySubject.map((s: any) => ({
      name: getSubjectLabel(s.subject as Subject),
      value: s._count,
      itemStyle: { color: SUBJECT_COLORS[s.subject as Subject] },
    }));
    pie.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} 题 ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: pieData,
        label: { show: true, fontSize: 12 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
      }],
    });
    window.addEventListener('resize', () => pie.resize());
  }

  // Bar chart - Difficulty distribution
  if (barChartRef.value) {
    const bar = echarts.init(barChartRef.value);
    const diffData = [1, 2, 3, 4, 5].map(d => {
      const found = statsData.byDifficulty.find((x: any) => x.difficulty === d);
      return { name: DIFFICULTY_LABELS[d as Difficulty], value: found?._count || 0 };
    });
    bar.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: diffData.map(d => d.name), axisLabel: { fontSize: 12 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar',
        data: diffData.map((d, i) => ({
          value: d.value,
          itemStyle: { color: DIFFICULTY_COLORS[(i + 1) as Difficulty], borderRadius: [6, 6, 0, 0] },
        })),
        barWidth: '40%',
      }],
      grid: { left: 40, right: 16, top: 16, bottom: 30 },
    });
    window.addEventListener('resize', () => bar.resize());
  }

  // Type chart
  if (typeChartRef.value) {
    const typeChart = echarts.init(typeChartRef.value);
    const typeData = statsData.byType.map((t: any) => ({
      name: QUESTION_TYPE_LABELS[t.type as QuestionType] || t.type,
      value: t._count,
    }));
    typeChart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: typeData.map((t: any) => t.name), axisLabel: { fontSize: 11, rotate: 15 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar',
        data: typeData.map((t: any, i: number) => ({
          value: t.value,
          itemStyle: {
            color: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'][i % 6],
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barWidth: '50%',
      }],
      grid: { left: 40, right: 16, top: 16, bottom: 30 },
    });
    window.addEventListener('resize', () => typeChart.resize());
  }
}

onMounted(async () => {
  try {
    const [qRes, pRes] = await Promise.all([
      fetch('/api/questions?pageSize=1'),
      fetch('/api/papers?pageSize=1'),
    ]);
    const qJson = await qRes.json();
    const pJson = await pRes.json();

    stats.value[0].value = qJson.data?.total || 0;
    stats.value[1].value = pJson.data?.total || 0;

    try {
      const psRes = await fetch('/api/practice/stats');
      const psJson = await psRes.json();
      if (psJson.success) {
        stats.value[2].value = psJson.data.totalAnswered;
        stats.value[3].value = psJson.data.accuracy + '%';
      }
    } catch {}

    try {
      const statsRes = await fetch('/api/questions/stats/summary');
      const statsJson = await statsRes.json();
      if (statsJson.success) {
        statsData = statsJson.data;
        await nextTick();
        initCharts();
      }
    } catch {}
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: var(--radius-xl);
  color: white;
  box-shadow: var(--shadow-md);
  transition: transform var(--transition), box-shadow var(--transition);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.stat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon {
  font-size: 26px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: 13px;
  opacity: 0.85;
  margin-top: 4px;
  font-weight: 500;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.chart-card {
  min-height: 300px;
}

.chart-container {
  width: 100%;
  height: 250px;
}

@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}
</style>
