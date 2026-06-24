<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-title">📚 私人题库</div>
      <ul class="sidebar-nav">
        <li><router-link to="/">📊 仪表盘</router-link></li>
        <li><router-link to="/questions">📝 题目管理</router-link></li>
        <li><router-link to="/papers">📄 试卷管理</router-link></li>
        <li><router-link to="/import">📥 批量导入</router-link></li>
      </ul>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>
