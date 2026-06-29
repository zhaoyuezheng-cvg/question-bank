<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📈</span>
        数据分析
      </h1>
      <div class="btn-group">
        <button v-for="p in periods" :key="p.value" class="btn" :class="{ 'btn-primary': period === p.value }" @click="changePeriod(p.value)">
          {{ p.label }}
        </button>
        <button class="btn" @click="exportReport">📊 导出报告</button>
      </div>
    </div>

    <!-- Summary -->
    <div class="stats-grid">
      <div class="stat-card-mini">
        <div class="stat-mini-val">{{ summary.totalRecords }}</div>
        <div class="stat-mini-lbl">答题数</div>
      </div>
      <div class="stat-card-mini">
        <div class="stat-mini-val" style="color: var(--success);">{{ summary.accuracy }}%</div>
        <div class="stat-mini-lbl">正确率</div>
      </div>
      <div class="stat-card-mini">
        <div class="stat-mini-val" style="color: var(--warning);">{{ weakAreas.length }}</div>
        <div class="stat-mini-lbl">薄弱知识点</div>
      </div>
      <div class="stat-card-mini">
        <div class="stat-mini-val" style="color: var(--primary);">{{ subjectStats.length }}</div>
        <div class="stat-mini-lbl">涉及学科</div>
      </div>
    </div>

    <!-- Radar + Subject Charts -->
    <div class="charts-row">
      <div class="card" style="flex: 1;">
        <div class="card-header">
          <span class="card-title">🎯 学科能力雷达图</span>
        </div>
        <div ref="radarChartRef" class="chart-container" style="height: 280px;"></div>
      </div>
      <div class="card" style="flex: 1;">
        <div class="card-header">
          <span class="card-title">📊 学科正确率</span>
        </div>
        <div ref="subjectChartRef" class="chart-container" style="height: 280px;"></div>
      </div>
    </div>

    <!-- Difficulty Accuracy -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">📊 难度正确率</span>
      </div>
      <div ref="difficultyChartRef" class="chart-container"></div>
    </div>

    <!-- Daily Trend -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">📈 答题趋势</span>
      </div>
      <div ref="trendChartRef" class="chart-container" style="height: 250px;"></div>
    </div>

    <!-- Weak Categories -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">⚠️ 薄弱知识点 TOP 10</span>
      </div>
      <div v-if="categoryStats.length" class="weak-list">
        <div v-for="(c, idx) in categoryStats.slice(0, 10)" :key="idx" class="weak-item">
          <div class="weak-rank" :class="idx < 3 ? 'rank-danger' : ''">{{ idx + 1 }}</div>
          <div class="weak-info">
            <div class="weak-name">{{ getSubjectLabel(c.subject as Subject) }} · {{ c.category }}</div>
            <div class="weak-bar">
              <div class="weak-bar-fill" :style="{ width: c.accuracy + '%', background: c.accuracy < 50 ? 'var(--danger)' : c.accuracy < 70 ? 'var(--warning)' : 'var(--success)' }"></div>
            </div>
          </div>
          <div class="weak-accuracy" :class="c.accuracy < 50 ? 'text-danger' : c.accuracy < 70 ? 'text-warning' : 'text-success'">
            {{ c.accuracy }}%
          </div>
          <div class="weak-count">{{ c.total }} 题</div>
        </div>
      </div>
      <div v-else class="empty-state" style="padding: 32px;">
        <p>暂无数据，开始答题后自动生成分析</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { getSubjectLabel, SUBJECT_LABELS, SUBJECT_COLORS, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/utils/constants';
import type { Subject, Difficulty } from 'shared/src/index';
import { apiGet } from '@/utils/api';

const subjectChartRef = ref<HTMLElement>();
const difficultyChartRef = ref<HTMLElement>();
const trendChartRef = ref<HTMLElement>();
const radarChartRef = ref<HTMLElement>();

const period = ref('all');
const periods = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '全部', value: 'all' },
];

const summary = ref({ totalRecords: 0, accuracy: 0 });
const subjectStats = ref<any[]>([]);
const categoryStats = ref<any[]>([]);
const difficultyStats = ref<any[]>([]);
const trend = ref<any[]>([]);
const weakAreas = ref<any[]>([]);

let charts: echarts.ECharts[] = [];
let statsResizeHandler: (() => void) | null = null;

function destroyCharts() {
  charts.forEach(c => c.dispose());
  charts = [];
  if (statsResizeHandler) {
    window.removeEventListener('resize', statsResizeHandler);
    statsResizeHandler = null;
  }
}

function initCharts() {
  destroyCharts();

  // Radar chart
  if (radarChartRef.value && subjectStats.value.length) {
    const chart = echarts.init(radarChartRef.value);
    charts.push(chart);
    const subjects = subjectStats.value.map(s => getSubjectLabel(s.subject as Subject));
    const values = subjectStats.value.map(s => s.accuracy);
    chart.setOption({
      tooltip: {},
      radar: {
        indicator: subjects.map(name => ({ name, max: 100 })),
        shape: 'polygon',
        splitArea: { areaStyle: { color: ['rgba(99,102,241,0.05)', 'rgba(99,102,241,0.1)'] } },
      },
      series: [{
        type: 'radar',
        data: [{
          value: values,
          name: '正确率',
          areaStyle: { color: 'rgba(99,102,241,0.2)' },
          lineStyle: { color: '#6366f1', width: 2 },
          itemStyle: { color: '#6366f1' },
        }],
        label: { show: true, formatter: '{c}%', fontSize: 11 },
      }],
    });
  }

  // Subject bar chart
  if (subjectChartRef.value && subjectStats.value.length) {
    const chart = echarts.init(subjectChartRef.value);
    charts.push(chart);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: subjectStats.value.map(s => getSubjectLabel(s.subject as Subject)), axisLabel: { fontSize: 12 } },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'bar',
        data: subjectStats.value.map(s => ({
          value: s.accuracy,
          itemStyle: { color: SUBJECT_COLORS[s.subject as Subject] || '#6366f1', borderRadius: [6, 6, 0, 0] },
        })),
        barWidth: '50%',
        label: { show: true, position: 'top', formatter: '{c}%', fontSize: 11 },
      }],
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
    });
  }

  // Difficulty chart
  if (difficultyChartRef.value && difficultyStats.value.length) {
    const chart = echarts.init(difficultyChartRef.value);
    charts.push(chart);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: difficultyStats.value.map(d => DIFFICULTY_LABELS[d.difficulty as Difficulty]) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'bar',
        data: difficultyStats.value.map(d => ({
          value: d.accuracy,
          itemStyle: { color: DIFFICULTY_COLORS[d.difficulty as Difficulty], borderRadius: [6, 6, 0, 0] },
        })),
        barWidth: '40%',
        label: { show: true, position: 'top', formatter: '{c}%', fontSize: 11 },
      }],
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
    });
  }

  // Trend chart
  if (trendChartRef.value && trend.value.length) {
    const chart = echarts.init(trendChartRef.value);
    charts.push(chart);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['答题数', '正确率'], bottom: 0 },
      xAxis: { type: 'category', data: trend.value.map(t => t.date.slice(5)) },
      yAxis: [
        { type: 'value', name: '题数', minInterval: 1 },
        { type: 'value', name: '正确率%', max: 100 },
      ],
      series: [
        { name: '答题数', type: 'bar', data: trend.value.map(t => t.total), itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] }, barWidth: '40%' },
        { name: '正确率', type: 'line', yAxisIndex: 1, data: trend.value.map(t => t.accuracy), smooth: true, lineStyle: { color: '#10b981' }, itemStyle: { color: '#10b981' }, areaStyle: { color: 'rgba(16,185,129,0.1)' } },
      ],
      grid: { left: 50, right: 50, top: 20, bottom: 40 },
    });
  }

  // 统一 resize handler
  statsResizeHandler = () => charts.forEach(c => c.resize());
  window.addEventListener('resize', statsResizeHandler);
}

async function loadData() {
  const params = new URLSearchParams();
  if (period.value !== 'all') params.set('period', period.value);

  const json = await apiGet(`/recommend/enhanced-stats?${params}`);
  if (json.success) {
    summary.value = { totalRecords: json.data.totalRecords, accuracy: json.data.totalRecords > 0 ? Math.round(json.data.subjectStats.reduce((a: number, s: any) => a + s.correct, 0) / json.data.subjectStats.reduce((a: number, s: any) => a + s.total, 0) * 100) || 0 : 0 };
    subjectStats.value = json.data.subjectStats;
    categoryStats.value = json.data.categoryStats;
    difficultyStats.value = json.data.difficultyStats;
    trend.value = json.data.trend;

    const weakJson = await apiGet('/recommend/weak?limit=5');
    if (weakJson.success) weakAreas.value = weakJson.data.weakAreas;

    await nextTick();
    initCharts();
  }
}

function changePeriod(p: string) {
  period.value = p;
  loadData();
}

function exportReport() {
  const periodLabel = periods.find(p => p.value === period.value)?.label || '全部';
  let md = `# 📊 数据分析报告 (${periodLabel})\n\n`;
  md += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  md += `## 概览\n`;
  md += `- 总答题数：${summary.value.totalRecords}\n`;
  md += `- 总正确率：${summary.value.accuracy}%\n`;
  md += `- 薄弱知识点：${weakAreas.value.length} 个\n\n`;

  if (subjectStats.value.length) {
    md += `## 学科正确率\n`;
    md += `| 学科 | 答题数 | 正确数 | 正确率 |\n|------|--------|--------|--------|\n`;
    for (const s of subjectStats.value) {
      const name = getSubjectLabel(s.subject as Subject);
      md += `| ${name} | ${s.total} | ${s.correct} | ${s.accuracy}% |\n`;
    }
    md += '\n';
  }

  if (categoryStats.value.length) {
    md += `## 薄弱知识点 TOP 10\n`;
    md += `| 排名 | 知识点 | 答题数 | 正确率 |\n|------|--------|--------|--------|\n`;
    categoryStats.value.slice(0, 10).forEach((c, i) => {
      const name = `${getSubjectLabel(c.subject as Subject)} · ${c.category}`;
      md += `| ${i+1} | ${name} | ${c.total} | ${c.accuracy}% |\n`;
    });
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `数据报告_${periodLabel}_${new Date().toISOString().slice(0,10)}.md`;
  a.click(); URL.revokeObjectURL(url);
}

onMounted(loadData);
</script>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.stat-card-mini { padding: 20px; background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow); text-align: center; border: 1px solid var(--border-light); }
.stat-mini-val { font-size: 32px; font-weight: 800; color: var(--primary); }
.stat-mini-lbl { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

.charts-row { display: flex; gap: 16px; margin-top: 16px; }
@media (max-width: 768px) { .charts-row { flex-direction: column; } .stats-grid { grid-template-columns: repeat(2, 1fr); } }

.chart-container { width: 100%; height: 200px; }

.weak-list { display: flex; flex-direction: column; gap: 8px; }
.weak-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-light); }
.weak-item:last-child { border-bottom: none; }
.weak-rank { width: 28px; height: 28px; border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.weak-rank.rank-danger { background: var(--danger-light); color: var(--danger); }
.weak-info { flex: 1; }
.weak-name { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.weak-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.weak-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
.weak-accuracy { font-weight: 700; font-size: 15px; min-width: 45px; text-align: right; }
.weak-count { font-size: 12px; color: var(--text-muted); min-width: 40px; text-align: right; }

.text-success { color: var(--success); }
.text-warning { color: var(--warning); }
.text-danger { color: var(--danger); }
</style>
