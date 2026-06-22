<script setup lang="ts">
import type { Category } from '~/store/v2/category';
import { createCategory, deleteCategory, getAllCategories, updateCategory, DEFAULT_CATEGORY_COLORS } from '~/store/v2/category';
import { clearCategoryFromAccounts } from '~/store/v2/info';
import toastFactory from '~/composables/toast';
import ConfirmModal from '~/components/modal/Confirm.vue';

const toast = toastFactory();
const modal = useModal();
const emit = defineEmits<{
  'category-changed': [];
}>();

const isOpen = ref(false);
const categories = ref<Category[]>([]);

const editingCategory = ref<{ id?: number; name: string; color: string } | null>(null);
const isSaving = ref(false);

const categoryColors = DEFAULT_CATEGORY_COLORS;

function open() {
  isOpen.value = true;
  loadCategories();
}

async function loadCategories() {
  categories.value = await getAllCategories();
}

// 新建分类
function startAdd() {
  editingCategory.value = { name: '', color: categoryColors[0].value };
}

// 编辑分类
function startEdit(cat: Category) {
  editingCategory.value = { id: cat.id, name: cat.name, color: cat.color };
}

function cancelEdit() {
  editingCategory.value = null;
}

async function saveCategory() {
  if (!editingCategory.value) return;
  if (!editingCategory.value.name.trim()) {
    toast.warning('请输入分类名称');
    return;
  }

  isSaving.value = true;
  try {
    if (editingCategory.value.id) {
      await updateCategory(editingCategory.value.id, {
        name: editingCategory.value.name.trim(),
        color: editingCategory.value.color,
      });
      toast.success('分类已更新');
    } else {
      await createCategory(editingCategory.value.name.trim(), editingCategory.value.color);
      toast.success('分类已创建');
    }
    editingCategory.value = null;
    emit('category-changed');
    await loadCategories();
  } catch (e: any) {
    toast.error('操作失败', e.message);
  } finally {
    isSaving.value = false;
  }
}

function confirmDelete(cat: Category) {
  modal.open(ConfirmModal, {
    title: `确定要删除分类「${cat.name}」吗？`,
    description: '删除后，该分类下的公众号将变为「未分类」状态，公众号数据不会丢失。',
    async onConfirm() {
      try {
        await clearCategoryFromAccounts(cat.id!);
        await deleteCategory(cat.id!);
        toast.success('分类已删除');
        emit('category-changed');
        await loadCategories();
      } catch (e: any) {
        toast.error('删除失败', e.message);
      }
    },
  });
}

defineExpose({ open });
</script>

<template>
  <UModal v-model="isOpen" :ui="{ width: 'max-w-md' }">
    <UCard :ui="{ divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">分类管理</h3>
          <UButton color="gray" variant="ghost" icon="i-lucide:x" @click="isOpen = false" />
        </div>
      </template>

      <!-- 新建/编辑表单 -->
      <div v-if="editingCategory" class="pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
        <div class="flex flex-col gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">分类名称</label>
            <UInput
              v-model="editingCategory.name"
              placeholder="输入分类名称"
              @keyup.enter="saveCategory"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">标签颜色</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in categoryColors"
                :key="c.value"
                type="button"
                class="w-7 h-7 rounded-full border-2 transition-all"
                :class="editingCategory.color === c.value ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'"
                :style="{ backgroundColor: c.value }"
                @click="editingCategory.color = c.value"
              />
            </div>
          </div>
          <div class="flex gap-2 justify-end mt-1">
            <UButton color="white" size="sm" @click="cancelEdit">取消</UButton>
            <UButton color="blue" size="sm" :loading="isSaving" @click="saveCategory">
              {{ editingCategory.id ? '保存' : '创建' }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- 分类列表 -->
      <div class="space-y-2">
        <div v-if="categories.length === 0" class="text-center py-8 text-gray-400 text-sm">
          暂无分类，点击上方按钮创建
        </div>
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 group"
        >
          <div class="flex items-center gap-3">
            <span
              class="w-3.5 h-3.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: cat.color }"
            />
            <span class="text-sm font-medium">{{ cat.name }}</span>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              icon="i-lucide:pencil"
              color="gray"
              variant="ghost"
              size="xs"
              @click="startEdit(cat)"
            />
            <UButton
              icon="i-lucide:trash-2"
              color="gray"
              variant="ghost"
              size="xs"
              @click="confirmDelete(cat)"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <UButton
          v-if="!editingCategory"
          icon="i-lucide:plus"
          color="blue"
          block
          @click="startAdd"
        >
          新建分类
        </UButton>
      </template>
    </UCard>
  </UModal>
</template>
