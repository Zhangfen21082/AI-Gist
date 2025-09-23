<script setup lang="ts">
import { ref, h, nextTick, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
// 引入侧边栏样式
import '~/styles/sidebar.css'
// 导入api和数据库hooks
import { api } from '~/lib/api'
import { useDatabase } from '~/composables/useDatabase'
import {
    NLayout,
    NLayoutSider,
    NLayoutContent,
    NLayoutFooter,
    NMenu,
    MenuOption,
    NIcon,
    NFlex,
    NText
} from 'naive-ui'
import {
    Folder as FolderIcon,
    Heart as HeartIcon,
    Tag as TagIcon,
    Settings as SettingsIcon,
    Diamonds as AIIcon,
    ChevronLeft,
    ChevronRight
} from '@vicons/tabler'

import SettingsPage from './SettingsPage.vue'
import PromptManagementPage from './PromptManagementPage.vue'
import AIConfigPage from './AIConfigPage.vue'
import StatusBar from '~/components/common/StatusBar.vue'
import SidebarContent from '~/components/common/SidebarContent.vue'

const { t } = useI18n()
// 定义视图类型
type ViewType = 'folders' | 'favorites' | 'tags' | 'ai-config' | 'settings';
const currentView = ref<ViewType>('folders')
const settingsTargetSection = ref<string>()

// 组件引用
const aiConfigPageRef = ref()

// 菜单选项
const menuOptions: MenuOption[] = [
    {
        label: t('mainPage.menu.folders'),
        key: 'folders',
        icon: () => h(NIcon, null, { default: () => h(FolderIcon) })
    },
    {
        label: t('mainPage.menu.favorites'),
        key: 'favorites',
        icon: () => h(NIcon, null, { default: () => h(HeartIcon) })
    },
    {
        label: t('mainPage.menu.tags'),
        key: 'tags',
        icon: () => h(NIcon, null, { default: () => h(TagIcon) })
    }
]

const handleMenuSelect = (key: string) => {
    currentView.value = key
    // 如果不是通过特定方式打开设置页面，重置目标区域
    if (key !== 'settings') {
        settingsTargetSection.value = undefined;
    }
}

const handleNavigateToAIConfig = async () => {
    currentView.value = 'ai-config'
    // 等待组件渲染完成后自动打开添加配置弹窗
    await nextTick()
    if (aiConfigPageRef.value?.openAddConfigModal) {
        aiConfigPageRef.value.openAddConfigModal()
    }
}

const handleOpenSettings = (targetSection?: string) => {
    currentView.value = 'settings'
    // 设置目标设置区域
    if (targetSection) {
        settingsTargetSection.value = targetSection;
    }
};

const collapseRef = ref(false)
const sidebarWidth = ref(260)
const sidebarRef = ref()
const resizerRef = ref()
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 开始拖动侧边栏
const startResize = (e) => {
    isResizing.value = true
    startX.value = e.clientX
    startWidth.value = sidebarWidth.value
    document.addEventListener('mousemove', resize)
    document.addEventListener('mouseup', stopResize)
}

// 拖动侧边栏
const resize = (e) => {
    if (isResizing.value) {
        const delta = e.clientX - startX.value
        // 限制侧边栏宽度在 200px 到 600px 之间
        const newWidth = Math.max(200, Math.min(600, startWidth.value + delta))
        sidebarWidth.value = newWidth
    }
}

// 停止拖动侧边栏
const stopResize = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', resize)
    document.removeEventListener('mouseup', stopResize)
}

// 侧边栏数据和方法
const selectedFolder = ref<string | null>(null)
const selectedTag = ref<string>('')
const showFavoritesOnly = ref(false)
const categories = ref<any[]>([])
const popularTags = ref<any[]>([])

// 获取数据库操作函数
const { safeDbOperation, waitForDatabase } = useDatabase()

// 获取分类和标签数据
const loadSidebarData = async () => {
    try {
        // 确保数据库已就绪
        await waitForDatabase()

        // 加载分类数据
        const categoryStats = await safeDbOperation(() => {
            // 检查API和方法是否存在
            if (!api?.categories?.getUsageStats?.query) {
                console.error('API 方法 api.categories.getUsageStats.query 不存在');
                return [];
            }
            return api.categories.getUsageStats.query();
        }, [])

        if (categoryStats && Array.isArray(categoryStats)) {
            // 转换成侧边栏需要的格式
            categories.value = categoryStats.map(cat => ({
                id: cat.categoryId.toString(),
                name: cat.categoryName,
                color: '#3498db', // 颜色可以单独获取或使用默认值
                promptCount: cat.promptCount
            }))

            // 获取未分类的提示词数量
            const uncategorizedCount = await safeDbOperation(() => {
                // 检查API和方法是否存在
                if (!api?.categories?.getUncategorizedCount?.query) {
                    console.error('API 方法 api.categories.getUncategorizedCount.query 不存在');
                    return 0;
                }
                return api.categories.getUncategorizedCount.query();
            }, 0)

            if (uncategorizedCount > 0) {
                // 添加"未分类"选项
                categories.value.push({
                    id: '0',
                    name: '未分类',
                    color: '#808080',
                    promptCount: uncategorizedCount
                })
            }
        }

        // 如果没有获取到数据，提供空数组而不是示例数据
        if (!categories.value.length) {
            console.info('没有获取到分类数据，使用空数组')
            categories.value = []
        }

        // 加载标签数据
        const tagResult = await safeDbOperation(() => {
            // 检查API和方法是否存在
            if (!api?.prompts?.getPopularTags?.query) {
                console.error('API 方法 api.prompts.getPopularTags.query 不存在');
                return [];
            }
            return api.prompts.getPopularTags.query({ limit: 10 });
        }, [])

        if (tagResult && Array.isArray(tagResult)) {
            popularTags.value = tagResult.map(tag => {
                // 使用安全的方式访问可能不存在的属性
                const tagData = tag as any;
                return {
                    name: typeof tagData.tagName === 'string' ? tagData.tagName : String(tagData.tagName || '未知标签'),
                    count: typeof tagData.count === 'number' ? tagData.count : 0
                };
            });
        }

        // 如果没有获取到数据，提供空数组而不是示例数据
        if (!popularTags.value.length) {
            console.info('没有获取到标签数据，使用空数组')
            popularTags.value = []
        }

    } catch (error) {
        console.error('加载侧边栏数据失败:', error)
        // 出错时使用空数组
        categories.value = []
        popularTags.value = []
    }
}

// 处理文件夹选择
const handleSelectFolder = (folderId: string | null) => {
    console.log(`MainPage - 选择文件夹, 旧值: ${selectedFolder.value}, 新值: ${folderId || '全部'}`)
    // 如果当前不是文件夹视图，先切换到文件夹视图
    if (currentView.value !== 'folders') {
        currentView.value = 'folders';
    }
    selectedFolder.value = folderId
}

// 处理收藏切换
const handleToggleFavorites = (showOnly: boolean) => {
    showFavoritesOnly.value = showOnly
    // 这里应该更新主内容区域的提示词列表
    console.log(`显示收藏: ${showOnly}`)
}

// 处理标签选择
const handleSelectTag = (tag: string) => {
    selectedTag.value = tag
    // 这里应该更新主内容区域的提示词列表
    console.log(`选择标签: ${tag}`)
}

// 处理创建新提示词
const handleCreatePrompt = () => {
    // 确保当前是文件夹视图
    if (!['folders', 'favorites', 'tags'].includes(currentView.value)) {
        currentView.value = 'folders'
    }

    // 通过nextTick确保视图已更新
    nextTick(() => {
        // 获取PromptManagementPage组件引用
        const element = document.querySelector('.prompt-management-page');
        // @ts-ignore - 使用内部Vue属性访问组件实例
        const promptManagementPageRef = element?.__vueParentComponent?.proxy;
        if (promptManagementPageRef && typeof promptManagementPageRef.handleCreatePrompt === 'function') {
            promptManagementPageRef.handleCreatePrompt()
        } else {
            console.error('无法找到PromptManagementPage组件或其handleCreatePrompt方法')
        }
    })
}

// 处理分类管理
const handleManageCategories = () => {
    // 确保当前是文件夹视图
    if (!['folders', 'favorites', 'tags'].includes(currentView.value)) {
        currentView.value = 'folders'
    }

    // 通过nextTick确保视图已更新
    nextTick(() => {
        // 获取PromptManagementPage组件引用
        const element = document.querySelector('.prompt-management-page');
        // @ts-ignore - 使用内部Vue属性访问组件实例
        const promptManagementPageRef = element?.__vueParentComponent?.proxy;
        if (promptManagementPageRef) {
            promptManagementPageRef.showCategoryManagement = true
        } else {
            console.error('无法找到PromptManagementPage组件')
        }
    })
}

// 这里不应该放导入语句，移到文件顶部

// 生命周期钩子
onMounted(async () => {
    await waitForDatabase() // 确保数据库已就绪
    loadSidebarData()
})

// 组件卸载时清理事件监听器
onBeforeUnmount(() => {
    document.removeEventListener('mousemove', resize)
    document.removeEventListener('mouseup', stopResize)
})

window.electronAPI.sendMessage('Hello from App.vue!')
</script>

<template>
    <div style="height: 100vh; ">
        <NLayout>
            <NLayout has-sider style="height: 100%; ">
                <NLayoutSider bordered collapse-mode="width" :collapsed-width="64"
                    @update:collapsed="collapseRef = $event" :default-collapsed="collapseRef" :width="sidebarWidth"
                    show-trigger="bar" class="sidebar-resizable" ref="sidebarRef">
                    <!-- 侧边栏可拖动控制按钮 -->
                    <div class="sidebar-control">
                        <NButton size="small" circle tertiary @click="collapseRef = !collapseRef">
                            <template #icon>
                                <NIcon>
                                    <ChevronLeft v-if="!collapseRef" />
                                    <ChevronRight v-else />
                                </NIcon>
                            </template>
                        </NButton>
                    </div>
                    <!-- 侧边栏拖动口 -->
                    <div
                        v-if="!collapseRef"
                        class="sidebar-resizer"
                        ref="resizerRef"
                        @mousedown="startResize"
                        :class="{dragging: isResizing}"
                    ></div>
                    <NFlex vertical align="center" justify="center" style="padding: 20px 10px 10px;" v-if="!collapseRef">
                        <NText strong style="font-size: 16px; ">
                            {{ t('mainPage.title') }}
                        </NText>
                    </NFlex>
                    <!-- 自定义侧边栏内容 -->
                    <div v-if="!collapseRef" style="height: calc(100% - 60px); overflow: hidden;">
                        <SidebarContent
                            :folder-data="categories"
                            :tag-data="popularTags"
                            @select-folder="handleSelectFolder"
                            @toggle-favorites="handleToggleFavorites"
                            @select-tag="handleSelectTag"
                            @create-prompt="handleCreatePrompt"
                            @manage-categories="handleManageCategories"
                        />
                    </div>
                    <!-- 仅在收起状态显示菜单 -->
                    <NMenu v-else :options="menuOptions" :value="currentView" @update:value="handleMenuSelect"
                        :collapsed-width="64" :collapsed-icon-size="22" style="margin-top: 8px;" />
                </NLayoutSider>

                <NLayout has-sider>
                    <NLayoutContent content-style="overflow-y: auto; height: calc(100vh - 24px);">
                        <PromptManagementPage v-if="(['folders', 'favorites', 'tags'] as ViewType[]).includes(currentView as any)"
                            :view-type="currentView"
                            :selected-folder="selectedFolder"
                            :selected-tag="selectedTag"
                            :show-favorites-only="showFavoritesOnly"
                            @navigate-to-ai-config="handleNavigateToAIConfig"
                            @open-settings="handleOpenSettings" />
                    </NLayoutContent>
                    <!-- 右侧边栏 - 用于 AI 配置和设置 -->
                    <NLayoutSider
                        v-if="currentView === 'ai-config' || currentView === 'settings'"
                        placement="right"
                        width="100%"
                        content-style="overflow-y: auto; height: 100%;"
                        bordered>
                        <AIConfigPage v-if="currentView === 'ai-config'" ref="aiConfigPageRef" />
                        <SettingsPage v-if="currentView === 'settings'" :target-section="settingsTargetSection" />
                    </NLayoutSider>
                </NLayout>
            </NLayout>
            <NLayoutFooter bordered style="height: 24px; padding: 0;">
                <StatusBar @open-settings="handleOpenSettings" />
            </NLayoutFooter>
        </NLayout>
    </div>
</template>
