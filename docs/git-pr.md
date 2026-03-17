任务：创建 Pull Request（需要 GitHub CLI）

前置条件：`gh auth login`（首次使用）

Remote 说明：
- `origin`   = 自己的 fork（fansanqiu/eagle-twitter-video-downloader）← PR 从此发起
- `upstream` = 原始仓库（OlivierEstevez/eagle-twitter-video-downloader）← PR 目标（如需向上游提 PR）
- 主分支：`master`

步骤：

1. **构建检查**（必须）：
   ```bash
   npm run build  # 确保构建无报错
   ```

2. **提交并推送到自己的 fork**（如未完成）：
   ```bash
   git status && git log origin/master..HEAD --oneline
   git push -u origin $(git branch --show-current)
   ```

3. **创建 PR**：

   **合并到自己 fork 的 master**（日常整合分支）：
   ```bash
   gh pr create --base master --head $(git branch --show-current) --repo fansanqiu/eagle-twitter-video-downloader \
     --title "✨ feat: <描述>" --body "<详情>"
   ```

   **向上游原始仓库提 PR**（贡献代码）：
   ```bash
   gh pr create --base master --head fansanqiu:$(git branch --show-current) --repo OlivierEstevez/eagle-twitter-video-downloader \
     --title "✨ feat: <描述>" --body "<详情>"
   ```

4. **查看**：
   ```bash
   gh pr view --web
   ```

PR 标题格式：`✨ feat` | `🐞 fix` | `🔁 refactor` | `📝 docs` | `🚀 perf` | `🎨 style` | `🧪 test` | `🧼 chore`
