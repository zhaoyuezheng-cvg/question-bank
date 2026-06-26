<template>
  <div v-if="loading" class="loading-state">
    <div class="loading-spinner"></div>
    <p class="loading-text">{{ loadingText }}</p>
  </div>
  <div v-else-if="empty" class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <p class="empty-title">{{ title }}</p>
    <p class="empty-desc">{{ description }}</p>
    <slot name="action" />
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
defineProps<{
  loading?: boolean;
  empty?: boolean;
  loadingText?: string;
  icon?: string;
  title?: string;
  description?: string;
}>();
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-muted);
  max-width: 300px;
}
</style>
