任务：基于项目改动，生成并执行 Git 提交和推送。

适用场景：日常提交、更新已有 PR（推送到 PR 分支会自动更新）

步骤：

1. **检查改动**：
   ```bash
   git status && git diff HEAD
   ```

2. **代码检查**（必须）：
   ```bash
   pnpm check:fix  # 自动修复格式问题
   pnpm check      # 确保无错误
   ```

3. **暂存并提交**：
   ```bash
   git add .
   git commit -m "🤖 Auto：<改动概述>

   <详细说明，每类一行>
   ✨ Feature：新增功能
   🐞 Bug Fix：修复 Bug
   🔁 Refactor：代码重构
   📝 Docs：文档更新
   🚀 Performance：性能优化
   🎨 Style：样式调整
   🧪 Test：测试相关
   🧼 Chore：构建维护"
   ```

4. **推送**：
   ```bash
   git push
   ```

注：创建新 PR 请使用 `scripts/git-pr.md`
