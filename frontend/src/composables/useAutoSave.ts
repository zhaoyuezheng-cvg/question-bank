import { ref, watch, onMounted } from 'vue';

export function useAutoSave(key: string, formRef: any, delay = 3000) {
  const hasDraft = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function save() {
    try {
      const data = typeof formRef.value === 'object' ? { ...formRef.value } : formRef.value;
      localStorage.setItem(`qb-draft-${key}`, JSON.stringify(data));
    } catch {}
  }

  function load(): any {
    try {
      const raw = localStorage.getItem(`qb-draft-${key}`);
      if (raw) {
        hasDraft.value = true;
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  }

  function clear() {
    localStorage.removeItem(`qb-draft-${key}`);
    hasDraft.value = false;
  }

  function scheduleSave() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, delay);
  }

  // Watch form changes
  watch(
    () => JSON.stringify(formRef.value),
    () => scheduleSave(),
    { deep: true }
  );

  return { hasDraft, load, clear, save };
}
