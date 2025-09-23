<template>
  <div class="app-initializer">
    <!-- 数据库初始化加载屏幕 -->
    <div v-if="!isDatabaseReady && !hasInitializationCompleted" class="loading-screen">
      <div class="loading-content">
        <div class="loading-spinner">
          <NSpin size="large" />
        </div>
        <div class="loading-text">
          <NText v-if="!databaseError" style="font-size: 18px;">
            正在初始化应用...
          </NText>
          <div v-else>
            <NText type="error" style="font-size: 18px; display: block; margin-bottom: 12px;">
              数据库初始化失败
            </NText>
            <NText depth="3" style="font-size: 14px; display: block; margin-bottom: 16px;">
              {{ databaseError }}
            </NText>
            <NFlex justify="center" :size="12">
              <NButton type="primary" @click="retry" :loading="isRetrying" size="large">
                {{ t('databaseStatus.retry') }}
              </NButton>
              <NButton type="warning" @click="repairAndRetry" :loading="isRepairing" size="large">
                {{ isRepairing ? t('databaseStatus.repairing') : t('databaseStatus.repair') }}
              </NButton>
              <NButton @click="continueWithoutDb" size="large" quaternary>
                继续使用应用
              </NButton>
            </NFlex>
          </div>
        </div>
      </div>
    </div>

    <!-- 应用主体（数据库初始化完成或用户选择继续后显示） -->
    <div v-else class="app-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NSpin, NText, NButton, NFlex } from 'naive-ui'
import { useDatabase } from '~/composables/useDatabase'
import { initDatabaseState } from '~/composables/useDatabase'
import { useI18n } from 'vue-i18n'
import { databaseService } from '~/lib/services'

const { isDatabaseReady, databaseError, clearError } = useDatabase()
const { t } = useI18n()

const hasInitializationCompleted = ref(false)
const isRetrying = ref(false)
const isRepairing = ref(false)

// 初始化数据库
const initializeDatabase = async () => {
  try {
    console.log('正在初始化数据库状态...')

    // 首先检查数据库健康状态并尝试修复
    try {
      const healthStatus = await databaseService.getHealthStatus()
      if (!healthStatus.healthy) {
        console.warn('检测到数据库问题，缺失表:', healthStatus.missingStores)
        console.log('正在尝试自动修复数据库...')
        const repairResult = await databaseService.repairDatabase()
        console.log('数据库修复结果:', repairResult)
      }
    } catch (healthError) {
      console.warn('数据库健康检查失败:', healthError)
    }

    // 初始化数据库状态
    await initDatabaseState()
    console.log('数据库状态初始化成功')
    hasInitializationCompleted.value = true
  } catch (error) {
    console.error('数据库状态初始化失败:', error)
    hasInitializationCompleted.value = true
  }
}

// 重试初始化
const retry = async () => {
  isRetrying.value = true
  clearError()
  hasInitializationCompleted.value = false

  try {
    // 先检查数据库健康状态
    console.log('重试: 检查数据库健康状态...')
    try {
      const checkResult = await databaseService.checkAndRepairDatabase()
      console.log('数据库检查和修复结果:', checkResult)
    } catch (checkError) {
      console.error('数据库健康检查失败:', checkError)
    }

    // 重新初始化
    await initializeDatabase()
  } finally {
    isRetrying.value = false
  }
}

// 修复数据库并重试
const repairAndRetry = async () => {
  if (isRepairing.value) return

  isRepairing.value = true
  clearError()
  hasInitializationCompleted.value = false

  try {
    console.log('开始修复数据库...')
    // 先检查健康状态
    const healthStatus = await databaseService.getHealthStatus()
    if (!healthStatus.healthy) {
      console.log('检测到数据库问题，开始修复...')
    }

    // 执行修复
    const repairResult = await databaseService.repairDatabase()
    console.log('修复结果:', repairResult)

    if (repairResult.success) {
      console.log('数据库修复成功，重新初始化')
      // 重新初始化数据库
      await initializeDatabase()
    } else {
      console.error('数据库修复失败:', repairResult.message)
    }
  } catch (error) {
    console.error('修复过程出错:', error)
  } finally {
    isRepairing.value = false
  }
}

// 继续使用应用（即使数据库未初始化）
const continueWithoutDb = () => {
  hasInitializationCompleted.value = true
  console.log('用户选择继续使用应用（数据库功能可能受限）')
}

// 组件挂载时初始化数据库
onMounted(() => {
  initializeDatabase()
})
</script>

<style scoped>
.app-initializer {
  width: 100%;
  height: 100vh;
}

.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--n-color);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px;
  background: var(--n-card-color);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--n-border-color);
  min-width: 320px;
  text-align: center;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.app-content {
  width: 100%;
  height: 100%;
}

/* 适配暗色主题 */
@media (prefers-color-scheme: dark) {
  .loading-screen {
    background: var(--n-color);
  }
}
</style>
