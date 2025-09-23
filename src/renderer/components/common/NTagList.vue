<template>
  <div class="tag-list">
    <NFlex vertical justify="center" align="center" v-if="tags.length === 0" class="empty-state">
      <NEmpty size="small" :description="t('sidebar.noTags')" />
    </NFlex>
    <div v-else class="tags-container">
      <NTag
        v-for="tag in tags"
        :key="tag.name"
        :color="getTagColor(tag)"
        :bordered="false"
        :type="selectedTag === tag.name ? 'primary' : 'default'"
        size="small"
        @click="selectTag(tag.name)"
        class="tag-item"
      >
        <template #icon>
          <NIcon><TagIcon /></NIcon>
        </template>
        {{ tag.name }} ({{ tag.count }})
      </NTag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon, NTag, NEmpty, NFlex } from 'naive-ui'
import { Tag as TagIcon } from '@vicons/tabler'
import { useTagColors } from '~/composables/useTagColors'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

// 定义组件接口
const props = defineProps<{
  tags: Array<any>, // 标签数据
  selectedTag: string // 当前选中的标签
}>()

// 定义事件
const emit = defineEmits<{
  'select': [tag: string]
}>()

// 使用标签颜色组合式函数
const { getTagColor: getOriginalTagColor } = useTagColors()

// 获取标签颜色
const getTagColor = (tag: any) => {
  if (typeof tag === 'string') {
    return getOriginalTagColor(tag)
  }
  return getOriginalTagColor(tag.name)
}

// 选择标签
const selectTag = (tag: string) => {
  emit('select', tag)
}
</script>

<style scoped>
.tag-list {
  width: 100%;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px;
}

.tag-item {
  cursor: pointer;
  transition: transform 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
}

.empty-state {
  height: 80px;
}
</style>