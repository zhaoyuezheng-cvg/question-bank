import { onMounted, onUnmounted } from 'vue';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboard(shortcuts: ShortcutConfig[]) {
  function handler(e: KeyboardEvent) {
    // Don't trigger in input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    for (const s of shortcuts) {
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
      const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();

      if (ctrlMatch && shiftMatch && keyMatch) {
        // Allow ⌘K even in inputs
        if (isInput && !(s.key === 'k' && (s.ctrl || s.meta))) continue;
        e.preventDefault();
        s.action();
        return;
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', handler));
  onUnmounted(() => window.removeEventListener('keydown', handler));
}
