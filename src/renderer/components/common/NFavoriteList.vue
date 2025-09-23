<template>
  <div class="favorites-list">
    <NFlex vertical justify="center" align="center" v-if="!hasFavorites" class="empty-state">
      <NEmpty size="small" :description="t('sidebar.noFavorites')" />
    </NFlex>
    <div v-else>
      <div
        class="favorite-option"
        :class="{ active: showFavoritesOnly }"
        @click="toggleFavoritesFilter(true)"
      >
        <NIcon color="#e74c3c"><HeartIcon /></NIcon>
        <span>{{ t('sidebar.showFavoritesOnly') }}</span>
      </div>
      <div
        class="favorite-option"
        :class="{ active: !showFavoritesOnly }"
        @click="toggleFavoritesFilter(false)"
      >
        <NIcon><CollectionIcon /></NIcon>
        <span>{{ t('sidebar.showAll') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon, NEmpty, NFlex } from 'naive-ui'
import { Heart as HeartIcon, Files as CollectionIcon } from '@vicons/tabler'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

// 定义组件接口
const props = defineProps<{
  favorites: Array<any>, // 收藏数据
  showFavoritesOnly: boolean // 是否仅显示收藏项
}>()

// 定义事件
const emit = defineEmits<{
  'toggle-favorites': [showOnly: boolean]
}>()

// 是否有收藏数据
const hasFavorites = computed(() => true) // 在实际中应该基于favorites计算

// 切换收藏筛选
const toggleFavoritesFilter = (showOnly: boolean) => {
  emit('toggle-favorites', showOnly)
}
</script>

<style scoped>
.favorites-list {
  width: 100%;
}

.favorite-option {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.favorite-option:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.favorite-option.active {
  background-color: var(--n-item-color-active);
  color: var(--n-item-text-color-active);
}

.favorite-option i {
  margin-right: 8px;
}

.favorite-option span {
  flex: 1;
}

.empty-state {
  height: 80px;
}
</style>