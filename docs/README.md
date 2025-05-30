# 开发文档

欢迎使用 Electron Vue 启动模板！本文档将帮助你快速上手项目开发。

## 📋 文档导航

### 🚀 快速开始
- [项目根目录 README](../README.md) - 项目概览和快速启动指南

### 🏗️ 核心技术指南
1. **[tRPC 和 Prisma 集成指南](./trpc-prisma-guide.md)**
   - 技术栈架构概览
   - 数据流程和类型安全
   - 核心文件说明

2. **[数据库模型管理](./database-models.md)**
   - Prisma Schema 语法
   - 数据库模型设计
   - 迁移和部署

3. **[API 接口开发](./api-development.md)**
   - tRPC 路由开发
   - 输入验证和错误处理
   - 前端集成使用

## 🔄 开发工作流

### 典型的功能开发流程：

1. **设计数据模型** → [数据库模型管理](./database-models.md)
   ```bash
   # 修改 prisma/schema.prisma
   # 推送变更到数据库
   yarn prisma db push
   yarn prisma generate
   ```

2. **实现数据库操作** → [API 接口开发](./api-development.md#第二步在数据库服务中添加方法)
   ```typescript
   // 在 src/main/database.ts 中添加方法
   async createModel(data) { /* ... */ }
   ```

3. **定义 API 路由** → [API 接口开发](./api-development.md#第三步定义-trpc-路由)
   ```typescript
   // 在 src/main/trpc.ts 中添加路由
   export const appRouter = router({
     models: router({ /* ... */ })
   });
   ```

4. **前端集成使用** → [API 接口开发](./api-development.md#第四步在前端使用接口)
   ```vue
   <!-- 在 Vue 组件中调用 API -->
   <script setup>
   const data = await window.electronAPI.trpc.models.getAll.query();
   </script>
   ```

## 🛠️ 开发工具

### 数据库管理
```bash
# 打开 Prisma Studio（可视化数据库管理）
yarn prisma studio
```

### 类型生成
```bash
# 重新生成 Prisma 客户端和类型
yarn prisma generate
```

### 开发服务器
```bash
# 启动开发环境（支持热重载）
yarn dev
```

## 📁 项目结构速览

```
src/
├── main/                 # Electron 主进程
│   ├── database.ts      # 数据库服务 (Prisma)
│   ├── trpc.ts         # API 路由定义 (tRPC)
│   ├── main.ts         # 主进程入口
│   └── preload.ts      # 预加载脚本 (IPC 桥接)
└── renderer/            # Vue 3 前端
    ├── lib/trpc.ts     # tRPC 客户端配置
    ├── components/     # Vue 组件
    └── assets/         # 静态资源

prisma/
├── schema.prisma       # 数据库模型定义
├── dev.db             # SQLite 开发数据库
└── migrations/        # 数据库迁移文件

docs/                   # 开发文档
```

## 🎯 常见开发场景

### 添加新的数据模型
1. 在 `prisma/schema.prisma` 中定义模型
2. 运行 `yarn prisma db push` 应用变更
3. 在 `src/main/database.ts` 中添加数据操作方法
4. 在 `src/main/trpc.ts` 中添加 API 路由
5. 在前端组件中调用 API

### 修改现有接口
1. 更新 `src/main/trpc.ts` 中的验证 schema
2. 修改对应的数据库操作方法
3. 更新前端调用代码（TypeScript 会提供类型检查）

### 数据库迁移
1. 修改 `prisma/schema.prisma`
2. 运行 `yarn prisma migrate dev --name migration_name`
3. 更新相关的代码

## 💡 提示和技巧

- **类型安全**：tRPC 提供端到端类型安全，充分利用 TypeScript 的类型检查
- **热重载**：开发环境支持前端和后端代码的热重载
- **数据验证**：使用 Zod 进行输入验证，确保数据安全
- **错误处理**：tRPC 提供了完善的错误处理机制
- **性能优化**：使用 Prisma 的 select 和 include 优化数据库查询

## 🤝 贡献指南

如果你发现文档有不准确或可以改进的地方，欢迎提交 PR 或创建 Issue！

---

**开始你的开发之旅吧！** 🚀
