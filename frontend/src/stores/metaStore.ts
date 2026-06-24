import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  subject: string;
  children: CategoryNode[];
}

export const useMetaStore = defineStore('meta', () => {
  const tags = ref<Tag[]>([]);
  const categories = ref<CategoryNode[]>([]);

  async function fetchTags() {
    const res = await fetch('/api/tags');
    const json = await res.json();
    if (json.success) tags.value = json.data;
  }

  async function createTag(name: string, color?: string) {
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    const json = await res.json();
    if (json.success) await fetchTags();
    return json;
  }

  async function deleteTag(id: string) {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) await fetchTags();
    return json;
  }

  async function fetchCategories(subject?: string) {
    const params = subject ? `?subject=${subject}` : '';
    const res = await fetch(`/api/categories${params}`);
    const json = await res.json();
    if (json.success) categories.value = json.data;
  }

  async function createCategory(subject: string, name: string, parentId?: string) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, name, parentId }),
    });
    const json = await res.json();
    if (json.success) await fetchCategories(subject);
    return json;
  }

  return {
    tags, categories,
    fetchTags, createTag, deleteTag,
    fetchCategories, createCategory,
  };
});
