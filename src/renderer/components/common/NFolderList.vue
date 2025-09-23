<template>
  <div class="folder-list">
    <div v-if="folders.length === 0" class="empty-state">
      <NEmpty size="small" :description="t('sidebar.noFolders')" />
    </div>
    <div v-else>
      <!-- 所有文件夹选项 -->
      <div
        class="folder-item"
        :class="{ 'folder-selected': selectedFolder === null }"
        @click="selectFolder(null)"
      >
        <NIcon><FolderIcon /></NIcon>
        <span>{{ t('sidebar.allFiles') }}</span>
        <span class="folder-count">{{ getTotalPromptCount() }}</span>
      </div>

      <!-- 分类文件夹列表 -->
      <div
        v-for="folder in folders"
        :key="folder.id"
        class="folder-item"
        :class="{ 'folder-selected': selectedFolder === folder.id }"
        @click="selectFolder(folder.id)"
      >
        <NIcon :color="folder.color || ''"><FolderIcon /></NIcon>
        <span>{{ folder.name }}</span>
        <span class="folder-count">{{ getPromptCountForFolder(folder.id) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon, NEmpty } from 'naive-ui'
import { Folder as FolderIcon } from '@vicons/tabler'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

// 定义组件接口
const props = defineProps<{
  folders: Array<any>, // 所有文件夹/分类
  selectedFolder: string | null // 当前选中的文件夹ID
}>()

// 定义事件
const emit = defineEmits<{
  'select': [folderId: string | null]
}>()

// 处理选择文件夹
const selectFolder = (folderId: string | null) => {
  emit('select', folderId)
}

// 获取指定文件夹中的提示词数量
const getPromptCountForFolder = (folderId: string) => {
  const folder = props.folders.find(f => f.id === folderId)
  return folder?.promptCount || folder?.prompts?.length || 0
}

// 获取所有提示词数量
const getTotalPromptCount = () => {
  return props.folders.reduce((total, folder) => {
    return total + (folder.promptCount || folder.prompts?.length || 0)
  }, 0)
}
</script>

<style scoped>
.folder-list {
  width: 100%;
}

.folder-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.folder-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.folder-selected {
  background-color: var(--n-item-color-active) !important;
  color: var(--n-item-text-color-active);
}

.folder-item i {
  margin-right: 8px;
}

.folder-item span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-count {
  flex: none;
  font-size: 12px;
  color: var(--n-text-color-disabled);
  margin-left: 8px;
}

.empty-state {
  padding: 12px 0;
}
</style>