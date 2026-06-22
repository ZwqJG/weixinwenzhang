<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import type { ICellRendererParams } from 'ag-grid-community';
import type { Category } from '~/store/v2/category';
import { getAllCategories } from '~/store/v2/category';
import { updateAccountCategory } from '~/store/v2/info';

const props = defineProps<{
  params: ICellRendererParams & {
    onCategoryChange?: (fakeid: string, categoryId: number | undefined) => void;
  };
}>();

const isOpen = ref(false);
const allCategories = ref<Category[]>([]);
// Map 缓存：O(1) 查找，避免模板中频繁 find()
const categoryMap = ref(new Map<number, Category>());

const selectedCategoryId = computed(() => props.params.data?.categoryId ?? undefined);

const currentCategory = computed(() => {
  const id = selectedCategoryId.value;
  return id !== undefined ? categoryMap.value.get(id) : undefined;
});

const currentCategoryLabel = computed(() => currentCategory.value?.name ?? '未分类');
const currentCategoryColor = computed(() => currentCategory.value?.color ?? '#9CA3AF');

async function loadCategories() {
  const cats = await getAllCategories();
  allCategories.value = cats;
  categoryMap.value = new Map(cats.filter(c => c.id !== undefined).map(c => [c.id!, c]));
}

onMounted(loadCategories);

// 展开时刷新分类，确保新创建的分类立即可选
watch(isOpen, async (val) => {
  if (val) {
    await loadCategories();
  }
});

async function handleSelect(categoryId: number | undefined) {
  isOpen.value = false;
  const fakeid = props.params.data?.fakeid;
  if (!fakeid) return;

  await updateAccountCategory(fakeid, categoryId);

  if (props.params.node) {
    props.params.node.setDataValue('categoryId', categoryId);
  }

  if (props.params.onCategoryChange) {
    props.params.onCategoryChange(fakeid, categoryId);
  }
}

const containerRef = ref<HTMLElement | null>(null);
onClickOutside(containerRef, () => {
  isOpen.value = false;
});
</script>

<template>
  <div ref="containerRef" class="relative w-full h-full flex items-center">
    <button
      type="button"
      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full"
      @click.stop="isOpen = !isOpen"
    >
      <span
        v-if="selectedCategoryId !== undefined"
        class="w-2.5 h-2.5 rounded-full flex-shrink-0"
        :style="{ backgroundColor: currentCategoryColor }"
      />
      <span :class="selectedCategoryId !== undefined ? '' : 'text-gray-400'">
        {{ currentCategoryLabel }}
      </span>
      <UIcon name="i-lucide:chevron-down" class="w-3 h-3 ml-auto text-gray-400" />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen && containerRef"
        class="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
        :style="{
          left: containerRef.getBoundingClientRect().left + 'px',
          top: containerRef.getBoundingClientRect().bottom + 4 + 'px',
        }"
      >
        <button
          type="button"
          class="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
          :class="{ 'font-medium': selectedCategoryId === undefined }"
          @click="handleSelect(undefined)"
        >
          <span class="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />
          未分类
        </button>
        <button
          v-for="cat in allCategories"
          :key="cat.id"
          type="button"
          class="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
          :class="{ 'font-medium': selectedCategoryId === cat.id }"
          @click="handleSelect(cat.id)"
        >
          <span
            class="w-2.5 h-2.5 rounded-full flex-shrink-0"
            :style="{ backgroundColor: cat.color }"
          />
          {{ cat.name }}
        </button>
      </div>
    </Teleport>
  </div>
</template>
