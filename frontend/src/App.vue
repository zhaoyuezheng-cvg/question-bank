<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-title">📚 私人题库</div>
      <ul class="sidebar-nav">
        <li><router-link to="/">📊 仪表盘</router-link></li>
        <li><router-link to="/questions">📝 题目管理</router-link></li>
        <li><router-link to="/papers">📄 试卷管理</router-link></li>
        <li><router-link to="/import">📥 批量导入</router-link></li>
        <li style="margin-top: 12px; padding: 0 20px; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">练习</li>
        <li><router-link to="/practice">🎯 答题练习</router-link></li>
        <li><router-link to="/practice/errors">📝 错题本</router-link></li>
        <li><router-link to="/favorites">❤️ 收藏夹</router-link></li>
      </ul>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>
