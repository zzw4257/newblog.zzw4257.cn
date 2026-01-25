# Jujutsu (jj)：一个现代化的、兼容 Git 的版本控制系统

Jujutsu (`jj`) 是一个用 Rust 编写的、强大的实验性版本控制系统 (VCS)。它旨在成为 Git 的一个更简单、更直观的替代品，同时仍然与现有的 Git 仓库和工作流兼容。你可以把它想象成一个拥有更友好用户体验和一些创新功能的 Git。

`jj` 默认使用 Git 仓库作为其存储后端，这意味着你可以将 `jj` 与 GitHub、GitLab 或任何其他 Git 托管服务一起使用，而你使用 Git 的同事甚至不会注意到任何差异。

!!! tip "核心优势"
    *   **工作副本即提交 (Working Copy as a Commit):** 更改会自动记录。不再需要 `git add` 或 `git stash`。
    *   **操作日志与撤销 (Operation Log & Undo):** 每个操作都会被记录，你可以轻松地 `jj undo` 错误。
    *   **自动变基 (Automatic Rebase):** 当你修改父提交时，后代提交会自动变基。
    *   **冲突作为一等公民 (First-Class Conflicts):** 冲突信息会存储在提交中，可以稍后解决，不会阻塞其他操作。
    *   **Git 兼容性:** 直接与 Git 仓库和远程仓库协同工作。

## 安装

`jj` 可以在 Windows、macOS 和 Ubuntu 上安装。

### Windows

1. **预编译二进制文件 (推荐):**

   * 从 [Jujutsu 发布页面](https://github.com/jj-vcs/jj/releases)下载最新的 `jj-*-windows-x86_64.zip`。
   * 解压 `jj.exe` 并将其放置在系统 `PATH` 环境变量包含的目录中 (例如, `C:\Program Files\jj`)。
2. **使用 `cargo` (如果你已安装 Rust):**

   ```powershell
   cargo install --locked --bin jj jj-cli --features vendored-openssl
   ```

   确保 `~/.cargo/bin` 在你的 `PATH` 中。

### macOS

1. **Homebrew (推荐):**

   ```bash
   brew install jj
   ```
2. **预编译二进制文件:**

   * 从 [Jujutsu 发布页面](https://github.com/jj-vcs/jj/releases)下载最新的 `jj-*-apple-darwin.tar.gz` (适用于 Apple Silicon) 或 `jj-*-x86_64-apple-darwin.tar.gz` (适用于 Intel Macs)。
   * 解压 `jj` 二进制文件并将其放置在 `PATH` 中的目录 (例如, `/usr/local/bin`)。
3. **使用 `cargo` (如果你已安装 Rust):**
   首先，确保你已安装开发工具：

   ```bash
   xcode-select --install
   ```

   然后安装 `jj`:

   ```bash
   # 选项 1: Vendored OpenSSL (更简单)
   cargo install --git https://github.com/jj-vcs/jj.git --features vendored-openssl --locked --bin jj jj-cli

   # 选项 2: 使用 Homebrew 的 OpenSSL (如果你偏好)
   # brew install openssl pkg-config
   # export PKG_CONFIG_PATH="$(brew --prefix)/opt/openssl@3/lib/pkgconfig"
   # cargo install --git https://github.com/jj-vcs/jj.git --locked --bin jj jj-cli
   ```

   确保 `~/.cargo/bin` 在你的 `PATH` 中。

### Ubuntu (Linux)

1. **预编译二进制文件 (推荐用于大多数发行版):**

   * 从 [Jujutsu 发布页面](https://github.com/jj-vcs/jj/releases)下载最新的 `jj-*-x86_64-unknown-linux-musl.tar.gz`。这个 `musl` 版本是静态链接的，应该能在大多数 Linux 发行版上工作。
   * 解压 `jj` 二进制文件并将其放置在 `PATH` 中的目录 (例如, `/usr/local/bin` 或 `~/.local/bin`)。
2. **使用 `cargo` (如果你已安装 Rust):**
   首先，安装依赖：

   ```bash
   sudo apt-get update
   sudo apt-get install libssl-dev openssl pkg-config build-essential
   ```

   然后安装 `jj`:

   ```bash
   cargo install --locked --bin jj jj-cli
   ```

   确保 `~/.cargo/bin` 在你的 `PATH` 中。

### 初始配置

安装后，配置你的姓名和邮箱：

```bash
jj config set --user user.name "你的名字"
jj config set --user user.email "your.email@example.com"
```

### Shell 自动补全 (可选但推荐)

为你的 shell 启用命令行自动补全。

* **Bash:** 添加到你的 `.bashrc` 或 `.bash_profile`:

  ```bash
  source <(jj util completion bash)
  # 或使用动态补全:
  # source <(COMPLETE=bash jj)
  ```
* **Zsh:** 添加到你的 `.zshrc`:

  ```bash
  autoload -U compinit && compinit
  source <(jj util completion zsh)
  # 或使用动态补全:
  # source <(COMPLETE=zsh jj)
  ```
* **Fish:** 添加到你的 `~/.config/fish/config.fish` (或在终端运行):

  ```fish
  jj util completion fish | source
  # 或使用动态补全 (通常在 fish >= 4.1 中自动生效):
  # COMPLETE=fish jj | source
  ```
* **PowerShell:** 添加到你的 PowerShell 配置文件 (`$PROFILE`):

  ```powershell
  Invoke-Expression (& { (jj util completion power-shell | Out-String) })
  ```

## 快速入门：概览

让我们克隆一个 Git 仓库并进行一些更改。

1. **克隆 Git 仓库:**
   `jj` 可以克隆现有的 Git 仓库。

   ```bash
   jj git clone https://github.com/octocat/Hello-World
   cd Hello-World
   ```

   这会创建一个 `.jj` 目录，旁边还有一个 (默认隐藏的) Git 仓库。
2. **检查状态:**

   ```bash
   jj st # jj status 的缩写
   ```

   输出可能如下所示：

   ```
   The working copy has no changes.
   Working copy  (@) : qxvmplsw fe1e1b67 (empty) (no description set)
   Parent commit (@-): kxryzrst 7fd1a60b master | (empty) Merge pull request #6 from Spaceghost/patch-1
   ```

   * `Working copy (@)`: 这是你当前的状态。它是一个真实的提交！
   * `qxvmplsw`: 这是 **变更ID (Change ID)** (稳定不变)。
   * `fe1e1b67`: 这是 **提交ID (Commit ID)** (每次修改都会改变，类似 Git 的 SHA)。
3. **描述你打算进行的变更:**
   在进行文件更改之前，或在任何时候，你都可以为当前工作副本提交设置“提交信息”。

   ```bash
   jj describe -m "更新 README 并添加问候语"
   # 或者运行 `jj describe` 打开编辑器
   ```
4. **进行更改:**
   编辑 `README` (例如，向其中添加 "Hi from Jujutsu!")。

   ```bash
   jj st
   ```

   输出:

   ```
   Working copy changes:
   M README
   Working copy  (@) : qxvmplsw 3c2a0f8e 更新 README 并添加问候语
   Parent commit (@-): kxryzrst 7fd1a60b master | (empty) Merge pull request #6 from Spaceghost/patch-1
   ```

   请注意:

   * 不需要 `jj add`！`jj` 会自动跟踪已知文件的更改。
   * 提交ID (`3c2a0f8e`) 改变了，但变更ID (`qxvmplsw`) 保持不变。你的工作副本提交被自动修正了。
5. **查看差异:**

   ```bash
   jj diff # 显示你工作副本提交中的更改
   jj diff --git # 以标准 Git diff 格式显示
   ```
6. **创建新的变更 (提交):**
   当你完成了当前的一系列修改，并想开始一个新的、独立的变更时：

   ```bash
   jj new -m "添加一个新的功能文件"
   # 现在你之前的更改位于一个独立的、“已完成”的提交中，
   # 并且你有了一个新的、空的工作副本提交。
   ```

   如果你进行了更改然后运行 `jj new`，你的工作副本更改将成为*旧*提交的一部分，而*新*提交将是空的，为新的工作做好准备。
7. **查看历史:**

   ```bash
   jj log
   ```

   这将显示提交图。你会看到你的变更ID和提交ID。
   你可以使用 "revsets" 来筛选：

   * `jj log -r @` (当前工作副本提交)
   * `jj log -r 'description(更新)'` (描述中包含 "更新" 的提交)
   * `jj log -r 'all()'` (所有提交)
8. **修正之前的提交:**
   如果你意识到在 "更新 README" 的提交中忘记了某些东西：

   ```bash
   # 1. 从 `jj log` 中找到它的变更ID (例如 qxvmplsw)
   # 2. 编辑那个提交:
   jj edit qxvmplsw
   # 3. 进行你的文件更改
   # 4. (可选) 如果需要，再次描述
   # 5. 创建一个新的空提交以“完成”对 qxvmplsw 的编辑:
   jj new
   ```

   或者，在你当前的工作副本提交中进行修复，然后：

   ```bash
   jj squash --into qxvmplsw # 将当前工作副本的更改移动到 qxvmplsw 中
   ```
9. **撤销错误:**
   `jj` 会记录每个操作。如果你搞砸了：

   ```bash
   jj op log # 查看操作日志
   jj undo   # 撤销上一个操作
   # jj undo <operation_id> # 撤销指定的操作
   ```
10. **与 Git 远程仓库交互:**

    * `jj git fetch`
    * `jj git push --all` (或指定书签/变更)

## 核心概念

* **工作副本即提交 (Working Copy as a Commit):** 你的工作目录状态始终由一个提交 (通常是 `@`) 表示。你所做的更改会自动修正这个提交。这消除了对暂存区 (`git add -p`) 或 `git stash` 的需求。
* **变更ID (Change ID) vs. 提交ID (Commit ID):**
  * **变更ID:** 一个概念性变更的稳定标识符，即使其内容 ( وبالتالي提交ID) 发生演变。用于在变基和修正过程中跟踪一个特性。
  * **提交ID:** 类似于 Git 的 SHA-1。唯一标识提交的内容和父提交。每当提交被修正或变基时都会改变。
* **操作日志 (`jj op log`, `jj undo`):** 每个修改仓库状态的命令都会被记录。这使你可以轻松撤销操作或将仓库恢复到先前的状态。
* **Revsets:** 一种强大的查询语言，用于选择修订版本 (例如, `@`, `all()`, `ancestors(X)`, `X | Y`)。详见 `jj help -k revsets`。
* **书签 (Bookmarks) (类似 Git 分支):** `jj bookmark create my-feature` 创建一个命名指针。与 Git 分支不同，除非你位于该提交上，否则它们不会随新提交自动移动。远程仓库被跟踪为 `bookmark@remote`。
* **冲突处理 (Conflict Handling):** 冲突 (例如, 来自变基或合并) 会被存储在*提交本身*之中。操作会成功，你可以稍后解决冲突。`jj status` 会显示有冲突的提交。使用 `jj resolve <file>` 或直接编辑文件，然后 `jj squash` 将解决方案合并到有冲突的提交中。

## 关键命令快速参考

| Git 命令(们)                          | Jujutsu 命令(们)                                                    | 注意                                                                  |
| ------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `git clone <url>`                   | `jj git clone <url>`                                              |                                                                       |
| `git pull`                          | `jj git fetch && jj rebase -d @origin/main` (示例)                | 拉取然后变基你的工作。或者简单地 `jj git pull` 进行合并。           |
| `git fetch`                         | `jj git fetch`                                                    |                                                                       |
| `git push`                          | `jj git push`                                                     | 通常是 `jj git push --change @` 或 `jj git push --bookmark main`  |
| `git status`                        | `jj st` 或 `jj status`                                          |                                                                       |
| `git log`                           | `jj log`                                                          | 使用 revsets 进行强大筛选。                                           |
| `git add <file>`                    | (修改文件不需要)                                                    | 对于新文件，如果未自动跟踪，则使用 `jj file track <new_file>`。     |
| `git commit -m "msg"`               | `jj describe -m "msg" && jj new`                                  | `describe` 针对当前工作副本, `new` 使其成为一个“已完成”的提交。 |
| `git commit --amend`                | (工作副本自动修正) 或 `jj squash`                                 | 编辑工作副本, 或 `jj squash --into <rev>`                           |
| `git rebase -i <base>`              | `jj rebase -s <rev> -d <new_base>`, `jj squash`, `jj edit` 等 | 更细粒度的命令。                                                      |
| `git checkout <branch/commit>`      | `jj edit <rev>` 或 `jj new <rev>`                               | `edit` 修改 `<rev>`, `new` 在 `<rev>` 之上创建新的工作副本。  |
| `git branch <name>`                 | `jj bookmark create <name>`                                       |                                                                       |
| `git stash` / `git stash pop`     | (不需要)                                                            | 工作副本是一个提交；只需 `jj new` 或 `jj edit` 另一个提交。       |
| `git diff`                          | `jj diff`                                                         | `jj diff -r <rev>` 查看特定提交的更改。                             |
| `git reset HEAD <file>` (取消暂存)  | `jj restore --from @- <file>` (近似)                              | 从其父提交恢复工作副本中的文件。                                      |
| Reflog /`git reset --hard HEAD@{1}` | `jj op log && jj undo` 或 `jj op restore <op_id>`               |                                                                       |

## 为何选择 Jujutsu？(总结)

* **简洁性:** 需要掌握的核心概念更少 (没有暂存区)。
* **安全性:** `jj undo` 是一个强大的安全网。
* **强大功能:** Revsets、一等公民的冲突和自动变基以更少的麻烦提供了高级工作流。
* **速度:** 设计目标是快速。
* **Git 互操作性:** 你不必离开 Git 生态系统。

## 更多资源

* **官方网站:** [https://jj-vcs.github.io/jj/](https://jj-vcs.github.io/jj/)
* **官方教程:** [https://jj-vcs.github.io/jj/latest/tutorial/](https://jj-vcs.github.io/jj/latest/tutorial/)
* **Git 对比:** [https://jj-vcs.github.io/jj/latest/git-comparison/](https://jj-vcs.github.io/jj/latest/git-comparison/)
* **`jj` 内置帮助:** `jj help`, `jj help <command>`, `jj help -k <keyword>` (例如, `jj help -k revsets`)

---

## 附录：深入探讨

### A. 更多关于 Revsets

Revsets 是选择修订版本的一种强大方式。这里有更多例子：

* `@`: 当前工作副本提交。
* `@--`: 工作副本提交的祖父提交。
* `root()`: 初始的空提交。
* `all()`: 所有提交。
* `none()`: 没有提交。
* `bookmarks()`: 本地书签指向的提交。
* `remote_bookmarks()`: 远程跟踪书签指向的提交。
* `main`: 名为 `main` 的书签。
* `main@origin`: `origin` 远程上的 `main` 书签。
* `ancestors(X)`: 提交 X 及其祖先。
* `X::Y`: X 的后代且是 Y 的祖先的提交 (包含 X 和 Y)。
* `X..Y`: 从 Y 可达但从 X 不可达的提交 (类似 `git log X..Y`)。
* `X & Y`: 交集 - 同时在 X 和 Y 中的提交。
* `X | Y`: 并集 - 在 X 或 Y 中或两者皆有的提交。
* `~X`: 排除 - 所有不在 X 中的提交。
* `description(pattern)`: 描述中包含 `pattern` 的提交。
* `author(pattern)`: 作者字符串包含 `pattern` 的提交。
* `file(pattern)`: 修改了匹配 `pattern` 的文件的提交 (例如, `file(src/main.rs)` 或 `file(glob:*.md)`)。

使用 `jj help -k revsets` 获取完整文档。

### B. 冲突解决示例

1. **制造一个冲突 (例如，在 `jj rebase` 或 `jj git fetch`之后):**
   `jj st` 可能会显示：

   ```
   Working copy  (@) : abcdef01 (conflict) My feature
   Parent commit (@-): 12345678 main
   Conflicts in:
     src/app.js   (3-way)
   ```
2. **检查冲突:**

   ```bash
   jj diff # 会在 src/app.js 中显示冲突标记
   cat src/app.js # 直接查看
   ```
3. **解决冲突:**

   * **选项 1: 手动编辑:** 在编辑器中打开 `src/app.js`，移除冲突标记 (`<<<<<<<`, `=======`, `>>>>>>>`)，并保存期望的版本。
   * **选项 2: 合并工具:**
     ```bash
     jj resolve src/app.js
     # 这会打开你配置的三方合并工具。
     # 或者选择一方：
     # jj resolve --tool :ours src/app.js  (保留合并中“我们”的更改)
     # jj resolve --tool :theirs src/app.js (保留合并中“他们”的更改)
     ```
4. **最终确定解决方案:**
   编辑或使用合并工具后，你的工作副本包含了已解决的文件。冲突元数据仍在提交 `abcdef01` 上。

   ```bash
   jj st
   # 可能会显示：
   # Working copy changes:
   # M src/app.js
   # Working copy  (@) : xyz12345 (no description set)
   # Parent commit (@-): abcdef01 (conflict) My feature
   # Conflict in parent commit has been resolved in working copy.
   ```

   现在，将此解决方案 "squash" (压缩/合并) 到有冲突的提交中：

   ```bash
   jj squash # 将当前工作副本的更改移动到其父提交 (即有冲突的提交)
   ```

   提交 `abcdef01` 将被更新 (新的提交ID，相同的变更ID)，并且不再标记为有冲突。后代提交将自动变基。

### C. Git 共同托管 (Co-location)

你可以在现有的 Git 仓库中直接初始化 `jj` 仓库 (或者克隆一个 Git 仓库然后在其中初始化 `jj`)，这样 `jj` 和 `git` 命令都可以在同一个目录中工作。这称为“共同托管”仓库。

* **在现有 Git 仓库中初始化 `jj`:**

  ```bash
  cd my-git-repo
  jj git init --colocate
  ```

  这将导入现有的 Git 提交，并设置 `.jj` 以与现有的 `.git` 目录一起工作。
* **克隆并共同托管:**

  ```bash
  jj git clone --colocate <git_url>
  ```

在共同托管的仓库中：

* `jj` 操作会更新 `jj` 的视图，并且也可以更新 Git 的引用 (例如, `HEAD`、分支)。
* 你仍然可以运行 `git` 命令。`jj git import` 可以用来将 `git` 命令所做的更改同步到 `jj` 的视图中，而 `jj git export` 则在需要时将 `jj` 的更改同步到 Git 引用 (对于书签通常是自动的)。

### D. 稀疏工作区 (Sparse Workspaces)

默认情况下，你的工作副本包含当前提交中的所有文件。`jj sparse` 允许你只检出文件的一个子集，这对于大型单体仓库 (monorepos) 可能很有用。

* `jj sparse list`: 显示当前的稀疏模式 (默认为 `.`，表示所有文件)。
* `jj sparse set --clear --add src/componentA --add docs/guide.md`: 工作副本中只包含 `src/componentA` 和 `docs/guide.md`。
* `jj sparse reset`: 返回到检出所有文件的状态。

即使文件不在你的稀疏检出中，如果它们被 `jj` 操作修改 (例如，影响非稀疏文件的变基)，这些更改仍然是工作副本提交的一部分。
