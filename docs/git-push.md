任务：基于项目改动，生成并执行 Git 提交和推送。

适用场景：日常提交、更新已有 PR（推送到 PR 分支会自动更新）

Remote 说明：
- `origin`   = 自己的 fork（fansanqiu/eagle-twitter-video-downloader）← 推送目标
- `upstream` = 原始仓库（OlivierEstevez/eagle-twitter-video-downloader）← 只拉取，不推送

步骤：

1. **检查改动**：
   ```bash
   git status && git diff HEAD
   ```

2. **构建检查**（必须）：
   ```bash
   npm run build  # 确保构建无报错
   ```

3. **暂存并提交**：
   ```bash
   git add Plugin/ js/
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

4. **推送到自己的 fork**：
   ```bash
   git push origin $(git branch --show-current)
   ```

注：创建新 PR 请使用 `docs/git-pr.md`
