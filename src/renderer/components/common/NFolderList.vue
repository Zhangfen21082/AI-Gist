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

      <!-- 可拖拽的分类文件夹列表 -->
      <VueDraggable
        v-model="folderList"
        v-bind="dragOptions"
        item-key="id"
        @start="drag = true"
        @end="handleDragEnd"
        handle=".folder-drag-handle"
        ghost-class="folder-ghost"
        chosen-class="folder-chosen"
      >
        <template #item="{ element, index }">
          <div
            class="folder-item"
            :class="{
              'folder-selected': selectedFolder === element.id,
              'folder-editing': editingFolderId === element.id
            }"
            @click="!editingFolderId ? selectFolder(element.id) : null"
          >
            <!-- 拖拽手柄 -->
            <div class="folder-drag-handle">
              <NIcon><DragIcon /></NIcon>
            </div>

            <!-- 文件夹图标 -->
            <NIcon :color="element.color || ''"><FolderIcon /></NIcon>

            <!-- 文件夹名称（编辑模式/显示模式） -->
            <div v-if="editingFolderId === element.id" class="folder-name-edit">
              <NInput
                v-model:value="editingFolderName"
                size="small"
                ref="editingInput"
                @blur="saveEditedFolderName"
                @keyup.enter="saveEditedFolderName"
                @keyup.esc="cancelEditingFolder"
                placeholder="输入文件夹名称"
                autofocus
              />
            </div>
            <span v-else class="folder-name">{{ element.name }}</span>

            <!-- 文件夹计数 -->
            <span class="folder-count">{{ getPromptCountForFolder(element.id) }}</span>

            <!-- 操作按钮组 -->
            <div class="folder-actions" v-if="selectedFolder === element.id && !editingFolderId">
              <NButton quaternary circle size="tiny" @click.stop="startEditingFolder(element)">
                <template #icon><NIcon><EditIcon /></NIcon></template>
              </NButton>
              <NButton quaternary circle size="tiny" @click.stop="deleteFolder(element.id)">
                <template #icon><NIcon><DeleteIcon /></NIcon></template>
              </NButton>
            </div>
          </div>
        </template>
      </VueDraggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { NIcon, NEmpty, NInput, NButton, useMessage } from 'naive-ui'
import { Folder as FolderIcon, Edit as EditIcon, Trash as DeleteIcon, GripVertical as DragIcon } from '@vicons/tabler'
import { useI18n } from 'vue-i18n'
import { api } from '~/lib/api'
import { useDatabase } from '~/composables/useDatabase'
import VueDraggable from 'vuedraggable'

// 国际化
const { t } = useI18n()
const message = useMessage()
const { safeDbOperation } = useDatabase()

// 定义组件接口
const props = defineProps<{
  folders: Array<any>, // 所有文件夹/分类
  selectedFolder: string | null // 当前选中的文件夹ID
}>()

// 定义事件
const emit = defineEmits<{
  'select': [folderId: string | null],
  'update': [],
  'reorder': [newOrder: Array<any>]
}>()

// 拖拽相关状态
const drag = ref(false)
const dragOptions = computed(() => {
  return {
    animation: 200,
    disabled: !!editingFolderId.value, // 编辑状态时禁用拖拽
    group: 'folders'
  }
})

// 编辑状态管理
const editingFolderId = ref<string | null>(null)
const editingFolderName = ref('')
const editingInput = ref<HTMLInputElement | null>(null)

// 创建本地数据副本用于拖拽排序
const folderList = ref<any[]>([])

// 监听 folders prop 变化，更新本地列表
watch(() => props.folders, (newFolders) => {
  folderList.value = [...newFolders]
}, { deep: true, immediate: true })

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

// 开始编辑文件夹
const startEditingFolder = (folder: any) => {
  // 检查是否为特殊ID（如"uncategorized"）
  if (folder.id && isNaN(parseInt(folder.id)) && folder.id !== 'uncategorized') {
    console.warn('尝试编辑特殊文件夹:', folder.id)
    message.warning(t('sidebar.cannotEditSpecialFolder'))
    return
  }

  editingFolderId.value = folder.id
  editingFolderName.value = folder.name

  // 确保输入框获取焦点
  nextTick(() => {
    if (editingInput.value?.focus) {
      editingInput.value.focus()
    }
  })
}

// 保存编辑的文件夹名称
const saveEditedFolderName = async () => {
  if (!editingFolderId.value) return

  try {
    // 检查名称是否为空
    if (!editingFolderName.value.trim()) {
      message.warning(t('sidebar.folderNameCannotBeEmpty'))
      editingFolderName.value = props.folders.find(f => f.id === editingFolderId.value)?.name || ''
      return
    }

    // 获取当前文件夹的原始名称
    const originalName = props.folders.find(f => f.id === editingFolderId.value)?.name || ''
    const newName = editingFolderName.value.trim()

    // 如果名称没有变化，无需保存
    if (originalName === newName) {
      // 结束编辑状态
      editingFolderId.value = null
      editingFolderName.value = ''
      return
    }

    // 检查名称是否已存在（排除当前编辑的文件夹）
    const nameExists = props.folders.some(f =>
      f.id !== editingFolderId.value &&
      f.name.toLowerCase() === newName.toLowerCase()
    )

    if (nameExists) {
      message.warning(t('sidebar.folderNameExists'))
      return
    }

    // 检查是否为特殊ID（如"uncategorized"）
    if (isNaN(parseInt(editingFolderId.value!))) {
      // 对于特殊ID的文件夹，只修改本地列表，不调用API
      const folder = props.folders.find(f => f.id === editingFolderId.value)
      if (folder) {
        folder.name = newName
      }
      message.success(t('sidebar.folderRenameSuccess'))
      emit('update')
    } else {
      // 对于普通ID，调用API保存修改
      const result = await safeDbOperation(() =>
        api.categories.update.mutate({
          id: parseInt(editingFolderId.value!),
          data: { name: newName }
        }), null
      )

      if (result) {
        message.success(t('sidebar.folderRenameSuccess'))
        // 通知父组件更新数据
        emit('update')
      }
    }
  } catch (error) {
    console.error('保存文件夹名称失败:', error)
    message.error(t('sidebar.folderRenameFailed'))
  } finally {
    // 结束编辑状态
    editingFolderId.value = null
    editingFolderName.value = ''
  }
}

// 取消编辑
const cancelEditingFolder = () => {
  editingFolderId.value = null
  editingFolderName.value = ''
}

// 删除文件夹
const deleteFolder = async (folderId: string) => {
  if (!confirm(t('sidebar.confirmDeleteFolder'))) return

  // 检查是否为特殊ID（如"uncategorized"）
  if (isNaN(parseInt(folderId))) {
    console.warn('尝试删除特殊文件夹:', folderId)
    message.warning(t('sidebar.cannotDeleteSpecialFolder'))
    return
  }

  try {
    const result = await safeDbOperation(() =>
      api.categories.delete.mutate(parseInt(folderId)), null
    )

    if (result) {
      message.success(t('sidebar.folderDeleteSuccess'))
      // 如果删除的是当前选中的文件夹，选中"全部"
      if (props.selectedFolder === folderId) {
        selectFolder(null)
      }
      // 通知父组件更新数据
      emit('update')
    }
  } catch (error) {
    console.error('删除文件夹失败:', error)
    message.error(t('sidebar.folderDeleteFailed'))
  }
}

// 处理拖拽结束
const handleDragEnd = () => {
  drag.value = false

  // 发送更新排序的事件
  emit('reorder', folderList.value)

  // 实际上更新顺序需要调用API
  updateFolderOrder()
}

// 更新文件夹排序
const updateFolderOrder = async () => {
  try {
    // 构建排序数据，过滤掉特殊ID（如'uncategorized'）
    const orderData = folderList.value
      .filter(folder => {
        // 只处理数字ID的文件夹，跳过特殊ID
        return folder.id && !isNaN(parseInt(folder.id));
      })
      .map((folder, index) => ({
        id: parseInt(folder.id),
        sortOrder: index
      }));

    if (orderData.length === 0) {
      // 没有有效的文件夹需要排序
      return;
    }

    // 检查是否存在排序API方法
    if (api.categories.updateOrder?.mutate) {
      // 调用API更新顺序
      await safeDbOperation(() =>
        api.categories.updateOrder.mutate(orderData), null
      )
    } else {
      console.warn('文件夹排序API不存在，尝试使用单独更新方法')
      // 对于每个文件夹，尝试单独更新它的排序属性
      for (const item of orderData) {
        await safeDbOperation(() =>
          api.categories.update.mutate({
            id: item.id,
            data: { sortOrder: item.sortOrder }
          }), null
        )
      }
    }
  } catch (error) {
    console.error('更新文件夹排序失败:', error)
    // 失败时不显示消息，静默失败
  }
}

// 设置特定文件夹为编辑状态（供父组件调用）
const setFolderEditMode = (folderId: string) => {
  // 查找该文件夹
  const folder = props.folders.find(f => f.id === folderId)
  if (folder) {
    startEditingFolder(folder)
  }
}

// 暴露方法给父组件
defineExpose({
  setFolderEditMode
})
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
  position: relative;
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

.folder-name {
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

/* 拖拽相关样式 */
.folder-drag-handle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  margin-right: 4px;
  opacity: 0.3;
  transition: opacity 0.2s;
}

.folder-item:hover .folder-drag-handle {
  opacity: 0.8;
}

.folder-ghost {
  opacity: 0.5;
  background-color: var(--n-color-hover) !important;
}

.folder-chosen {
  background-color: var(--n-color-hover-light) !important;
}

/* 编辑状态样式 */
.folder-name-edit {
  flex: 1;
  margin-right: 8px;
}

.folder-editing {
  background-color: var(--n-color-hover-light) !important;
}

/* 文件夹操作按钮 */
.folder-actions {
  display: none;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--n-color-modal);
  border-radius: 4px;
  padding: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 5;
}

.folder-item:hover .folder-actions {
  display: flex;
}
</style>