<template>
  <div class="sidebar-content">
    <!-- 文件夹部分 (可调整高度) -->
    <div class="sidebar-section folders-section" :style="{ height: folderSectionHeight + 'px' }">
      <div class="section-header">
        <NText strong>{{ t('sidebar.folders') }}</NText>
        <div>
          <NTooltip>
            <template #trigger>
              <NButton quaternary circle size="small" @click="handleManageCategories">
                <template #icon>
                  <NIcon><FolderPlusIcon /></NIcon>
                </template>
              </NButton>
            </template>
            {{ t('sidebar.manageFolder') }}
          </NTooltip>
          <NTooltip>
            <template #trigger>
              <NButton quaternary circle size="small" @click="handleCreatePrompt">
                <template #icon>
                  <NIcon><PlusIcon /></NIcon>
                </template>
              </NButton>
            </template>
            {{ t('sidebar.createPrompt') }}
          </NTooltip>
        </div>
      </div>
      <NScrollbar style="max-height: calc(100% - 40px);" trigger="hover">
        <div class="section-content">
          <NFolderList
            :folders="folders"
            :selected-folder="selectedFolder"
            @select="handleSelectFolder"
          />
        </div>
      </NScrollbar>
      <!-- 文件夹和收藏之间的调整手柄 -->
      <div
        class="resize-handle folder-favorites-handle"
        @mousedown="startResizeFolderFavorites"
        :class="{ 'dragging': isResizingFolderFavorites }"
      ></div>
    </div>

    <!-- 收藏部分 (可调整高度) -->
    <div class="sidebar-section favorites-section" :style="{ height: favoriteSectionHeight + 'px' }">
      <div class="section-header">
        <NText strong>{{ t('sidebar.favorites') }}</NText>
      </div>
      <NScrollbar style="max-height: calc(100% - 40px);" trigger="hover">
        <div class="section-content">
          <NFavoriteList
            :favorites="favorites"
            :show-favorites-only="showFavoritesOnly"
            @toggle-favorites="toggleFavorites"
          />
        </div>
      </NScrollbar>
      <!-- 收藏和标签之间的调整手柄 -->
      <div
        class="resize-handle favorites-tags-handle"
        @mousedown="startResizeFavoritesTags"
        :class="{ 'dragging': isResizingFavoritesTags }"
      ></div>
    </div>

    <!-- 标签部分 (可调整高度) -->
    <div class="sidebar-section tags-section" :style="{ height: tagSectionHeight + 'px' }">
      <div class="section-header">
        <NText strong>{{ t('sidebar.tags') }}</NText>
      </div>
      <NScrollbar style="max-height: calc(100% - 40px);" trigger="hover">
        <div class="section-content">
          <NTagList
            :tags="tags"
            :selected-tag="selectedTag"
            @select="handleSelectTag"
          />
        </div>
      </NScrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { NText, NScrollbar, NTag, NEmpty, NButton, NFlex, NIcon, NTooltip } from 'naive-ui'
import { Heart, Plus as PlusIcon, FolderPlus as FolderPlusIcon } from '@vicons/tabler'
import { api } from '~/lib/api'
import NFolderList from './NFolderList.vue'
import NFavoriteList from './NFavoriteList.vue'
import NTagList from './NTagList.vue'

// 定义组件接口
const props = defineProps<{
  // 用于接收外部传入的文件夹、收藏夹和标签数据
  folderData?: any[],
  tagData?: any[],
}>()

// 定义事件
const emit = defineEmits<{
  'select-folder': [folderId: string | null],
  'toggle-favorites': [showOnly: boolean],
  'select-tag': [tag: string],
  'create-prompt': [],
  'manage-categories': []
}>()

// 国际化
const { t } = useI18n()

// 内部状态
const selectedFolder = ref<string | null>(null)
const selectedTag = ref<string>('')
const showFavoritesOnly = ref(false)

// 控制各区域高度的变量
const totalHeight = ref(0)
const folderSectionHeight = ref(0)
const favoriteSectionHeight = ref(0)
const tagSectionHeight = ref(0)

// 拖动调整的状态
const isResizingFolderFavorites = ref(false)
const isResizingFavoritesTags = ref(false)
const startY = ref(0)
const startFolderHeight = ref(0)
const startFavoriteHeight = ref(0)
const startTagHeight = ref(0)

// 计算整体区域高度
const updateTotalHeight = () => {
  const sidebarElement = document.querySelector('.sidebar-content')
  if (sidebarElement) {
    totalHeight.value = sidebarElement.clientHeight

    // 首次计算时设置默认高度
    if (folderSectionHeight.value === 0) {
      folderSectionHeight.value = Math.floor(totalHeight.value * 0.5)
      favoriteSectionHeight.value = Math.floor(totalHeight.value * 0.25)
      tagSectionHeight.value = totalHeight.value - folderSectionHeight.value - favoriteSectionHeight.value
    }
  }
}

// 文件夹、收藏夹和标签数据
const folders = computed(() => props.folderData || [])
const favorites = computed(() => []) // 这里应该由外部传入或通过 API 获取
const tags = computed(() => props.tagData || [])

// 处理文件夹选择
const handleSelectFolder = (folderId: string | null) => {
  selectedFolder.value = folderId
  emit('select-folder', folderId)
}

// 处理收藏夹筛选
const toggleFavorites = (showOnly: boolean) => {
  showFavoritesOnly.value = showOnly
  emit('toggle-favorites', showOnly)
}

// 处理标签选择
const handleSelectTag = (tag: string) => {
  selectedTag.value = tag
  emit('select-tag', tag)
}

// 处理新建提示词
const handleCreatePrompt = () => {
  emit('create-prompt')
}

// 处理分类管理
const handleManageCategories = () => {
  emit('manage-categories')
}

// 开始拖动调整文件夹和收藏部分的大小
const startResizeFolderFavorites = (e: MouseEvent) => {
  isResizingFolderFavorites.value = true
  startY.value = e.clientY
  startFolderHeight.value = folderSectionHeight.value
  startFavoriteHeight.value = favoriteSectionHeight.value

  document.addEventListener('mousemove', resizeFolderFavorites)
  document.addEventListener('mouseup', stopResizeFolderFavorites)
}

// 拖动调整文件夹和收藏部分的大小
const resizeFolderFavorites = (e: MouseEvent) => {
  if (!isResizingFolderFavorites.value) return

  const deltaY = e.clientY - startY.value

  // 计算新的高度
  const newFolderHeight = Math.max(50, startFolderHeight.value + deltaY)
  const maxFolderHeight = totalHeight.value - tagSectionHeight.value - 50 // 保留至少50px给收藏部分
  const adjustedFolderHeight = Math.min(newFolderHeight, maxFolderHeight)

  // 更新高度
  folderSectionHeight.value = adjustedFolderHeight
  favoriteSectionHeight.value = totalHeight.value - adjustedFolderHeight - tagSectionHeight.value
}

// 停止拖动调整文件夹和收藏部分的大小
const stopResizeFolderFavorites = () => {
  isResizingFolderFavorites.value = false
  document.removeEventListener('mousemove', resizeFolderFavorites)
  document.removeEventListener('mouseup', stopResizeFolderFavorites)
}

// 开始拖动调整收藏和标签部分的大小
const startResizeFavoritesTags = (e: MouseEvent) => {
  isResizingFavoritesTags.value = true
  startY.value = e.clientY
  startFavoriteHeight.value = favoriteSectionHeight.value
  startTagHeight.value = tagSectionHeight.value

  document.addEventListener('mousemove', resizeFavoritesTags)
  document.addEventListener('mouseup', stopResizeFavoritesTags)
}

// 拖动调整收藏和标签部分的大小
const resizeFavoritesTags = (e: MouseEvent) => {
  if (!isResizingFavoritesTags.value) return

  const deltaY = e.clientY - startY.value

  // 计算新的高度
  const newFavoriteHeight = Math.max(50, startFavoriteHeight.value + deltaY)
  const availableHeight = totalHeight.value - folderSectionHeight.value
  const maxFavoriteHeight = availableHeight - 50 // 保留至少50px给标签部分
  const adjustedFavoriteHeight = Math.min(newFavoriteHeight, maxFavoriteHeight)

  // 更新高度
  favoriteSectionHeight.value = adjustedFavoriteHeight
  tagSectionHeight.value = totalHeight.value - folderSectionHeight.value - favoriteSectionHeight.value
}

// 停止拖动调整收藏和标签部分的大小
const stopResizeFavoritesTags = () => {
  isResizingFavoritesTags.value = false
  document.removeEventListener('mousemove', resizeFavoritesTags)
  document.removeEventListener('mouseup', stopResizeFavoritesTags)
}

// 窗口大小变化时重新计算高度
const handleResize = () => {
  updateTotalHeight()
}

// 当组件挂载时加载数据和初始化高度
onMounted(async () => {
  // 如果需要加载初始数据，可以在这里添加

  // 初始化高度
  updateTotalHeight()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 当组件卸载时移除事件监听
const onBeforeUnmount = () => {
  document.removeEventListener('mousemove', resizeFolderFavorites)
  document.removeEventListener('mouseup', stopResizeFolderFavorites)
  document.removeEventListener('mousemove', resizeFavoritesTags)
  document.removeEventListener('mouseup', stopResizeFavoritesTags)
  window.removeEventListener('resize', handleResize)
}
</script>

<style scoped>
.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-section {
  padding: 8px;
  border-bottom: 1px solid var(--n-border-color);
  position: relative; /* 为拖动手柄定位提供相对位置 */
}

/* 移除固定高度，改为动态控制 */
.folders-section,
.favorites-section,
.tags-section {
  overflow: hidden; /* 避免内容溢出 */
  min-height: 50px; /* 最小高度限制 */
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 8px;
  height: 32px;
}

.section-content {
  padding: 4px 8px;
}

/* 调整大小的手柄样式 */
.resize-handle {
  position: absolute;
  left: 0;
  width: 100%;
  height: 6px; /* 调整手柄的高度 */
  cursor: row-resize; /* 上下调整的光标 */
  background-color: transparent;
  transition: background-color 0.2s;
  z-index: 10;
}

/* 文件夹和收藏之间的手柄 */
.folder-favorites-handle {
  bottom: -3px; /* 位于区域底部 */
}

/* 收藏和标签之间的手柄 */
.favorites-tags-handle {
  bottom: -3px; /* 位于区域底部 */
}

/* 悬停和拖动状态显示效果 */
.resize-handle:hover,
.resize-handle.dragging {
  background-color: rgba(128, 128, 128, 0.3);
}
</style>