任务：创建 Pull Request（需要 GitHub CLI）

前置条件：`gh auth login`（首次使用）

步骤：

1. **代码检查**（必须）：
   ```bash
   pnpm check:fix  # 自动修复格式问题
   pnpm check      # 确保无错误
   ```

2. **提交并推送**（如未完成）：
   ```bash
   git status && git log origin/develop..HEAD --oneline
   git push -u origin $(git branch --show-current)
   ```

3. **创建 PR**：
   ```bash
   # 交互式创建（推荐）
   gh pr create --base develop
   
   # 或直接指定
   gh pr create --title "✨ feat: <描述>" --body "<详情>" --base develop
   
   # 可选：--draft | --reviewer @user | --label name
   ```

4. **查看**：
   ```bash
   gh pr view --web
   ```

PR 标题格式：`✨ feat` | `🐞 fix` | `🔁 refactor` | `📝 docs` | `🚀 perf` | `🎨 style` | `🧪 test` | `🧼 chore`
