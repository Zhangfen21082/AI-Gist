import { ref, onMounted, readonly } from 'vue'
import { databaseService } from '../lib/db'

// 全局数据库状态
const isDatabaseReady = ref(false)
const databaseError = ref<string | null>(null)

/**
 * 数据库状态管理 composable
 */
export function useDatabase() {
  const isLoading = ref(false)

  /**
   * 等待数据库就绪
   */
  const waitForDatabase = async (): Promise<boolean> => {
    if (isDatabaseReady.value) {
      return true
    }

    isLoading.value = true
    databaseError.value = null

    try {
      // 增加重试逻辑
      let retryCount = 0;
      const maxRetries = 3;
      let lastError;

      while (retryCount < maxRetries) {
        try {
          await databaseService.waitForInitialization()
          isDatabaseReady.value = true
          console.log('数据库初始化成功')
          return true
        } catch (error) {
          lastError = error
          retryCount++
          console.warn(`数据库初始化尝试 ${retryCount}/${maxRetries} 失败:`, error)
          // 短暂延迟后重试
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // 所有重试均失败
      throw lastError
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '数据库初始化失败'
      databaseError.value = errorMessage
      console.error('数据库初始化失败 (所有重试均失败):', error)

      // 尝试修复数据库
      try {
        console.log('尝试自动修复数据库...')
        const repairResult = await databaseService.checkAndRepairDatabase()
        if (repairResult.healthy) {
          console.log('数据库修复成功，重新尝试初始化')
          isDatabaseReady.value = true
          databaseError.value = null
          return true
        } else {
          console.error('数据库修复失败:', repairResult.message)
        }
      } catch (repairError) {
        console.error('数据库修复过程出错:', repairError)
      }

      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 安全执行数据库操作
   */
  const safeDbOperation = async <T>(
    operation: () => Promise<T>,
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      const ready = await waitForDatabase()
      if (!ready) {
        console.warn('数据库未就绪，跳过操作')
        return fallback
      }
      try {
        return await operation()
      } catch (opError) {
        console.error('数据库操作执行失败:', opError)

        // 检查是否是对象存储不存在错误，尝试修复
        if (opError instanceof Error &&
            (opError.message.includes('object store') ||
             opError.message.includes('not found'))) {

          console.warn('检测到对象存储错误，尝试修复数据库...')
          const repairResult = await databaseService.checkAndRepairDatabase()

          if (repairResult.healthy) {
            console.log('数据库修复成功，重试操作')
            return await operation()
          }
        }

        throw opError
      }
    } catch (error) {
      console.error('数据库操作失败:', error)
      databaseError.value = error instanceof Error ? error.message : '操作失败'
      return fallback
    }
  }

  /**
   * 重置错误状态
   */
  const clearError = () => {
    databaseError.value = null
  }

  return {
    isDatabaseReady: readonly(isDatabaseReady),
    databaseError: readonly(databaseError),
    isLoading: readonly(isLoading),
    waitForDatabase,
    safeDbOperation,
    clearError
  }
}

/**
 * 初始化数据库状态（仅在应用启动时调用一次）
 */
export async function initDatabaseState() {
  try {
    // 检查数据库健康状态
    const healthResult = await databaseService.getHealthStatus()
    if (!healthResult.healthy) {
      console.warn('数据库健康检查失败，缺失表:', healthResult.missingStores)
      console.log('正在尝试修复数据库...')
      await databaseService.repairDatabase()
    }

    // 等待数据库初始化
    await databaseService.waitForInitialization()
    isDatabaseReady.value = true
    databaseError.value = null
    console.log('数据库状态初始化成功')
  } catch (error) {
    databaseError.value = error instanceof Error ? error.message : '数据库初始化失败'
    console.error('数据库状态初始化失败:', error)

    // 尝试自动修复
    try {
      console.log('初始化失败，尝试自动修复...')
      const repairResult = await databaseService.checkAndRepairDatabase()
      if (repairResult.repaired) {
        console.log('数据库修复成功，重新初始化')
        await databaseService.waitForInitialization()
        isDatabaseReady.value = true
        databaseError.value = null
      }
    } catch (repairError) {
      console.error('数据库修复失败:', repairError)
    }
  }
}
