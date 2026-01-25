 **OmniParser V2**是一套功能强大、免费且开源的人工智能工具集。它主要包含两个核心组件：
1.  **OmniParser V2 (核心解析器/引擎):** 一个用于视觉情境文本解析 (VsTP) 和屏幕理解的复杂框架。
2.  **OmniTool (计算机使用代理):** 一个构建于 OmniParser V2 之上的智能代理系统，允许大语言模型 (LLM) 查看您的屏幕并控制您的计算机。

该技术旨在将任何 LLM 转变为一个能够理解屏幕上复杂视觉信息并像人类一样执行操作的智能代理。

## 关键区别：OmniParser vs. OmniTool

理解它们之间的区别至关重要：

*   **OmniParser V2 (引擎 - `microsoft/OmniParser`)**:
    *   **功能:** 这是屏幕解析引擎。它获取用户界面截图（或文档图像）并将其转换为 LLM 可以理解的结构化格式。
    *   **核心技术:** 使用“结构化思维点 (SPOT)”提示模式和统一的编码器-解码器架构。
    *   **统一任务:** 文本定位、关键信息提取、表格识别和布局分析。
    *   **V2 中的改进:**
        *   与 V1 相比，延迟降低 60%。
        *   更好地理解各种操作系统应用程序和应用内图标。
        *   使用基于令牌路由的共享解码器（简化的 MoE 混合专家模型），减小了模型尺寸（缩小 23.6%）并增强了性能。
    *   **输出:** 结构化数据（例如 JSON），表示屏幕元素、其位置和内容。

*   **OmniTool (代理 - `microsoft/OmniTool`)**:
    *   **功能:** 这是计算机使用代理。它利用 OmniParser V2 来“看见”屏幕，然后使用 LLM 根据用户提示来决定并执行操作（鼠标点击、键入等）。
    *   **能力:** 允许 LLM 与您计算机的图形用户界面 (GUI) 交互以执行任务。
    *   **工作原理:** 您给它一个自然语言提示（例如，“在 Instacart 上帮我买牛奶”）。OmniTool 捕获屏幕，OmniParser 分析它，LLM 规划操作，然后 OmniTool 执行这些操作。
    *   **设置:** 更为复杂，通常需要一个 Windows 11 虚拟机（通常在 Docker 内）供代理运行。

## 主要特性与功能

*   **屏幕理解:** 从截图或实时屏幕捕获中准确解析 UI 元素、文本、图标和布局。
*   **计算机控制 (通过 OmniTool):** 使 LLM 能够执行鼠标移动、点击和键入等操作，以在计算机上自动执行任务。
*   **视觉情境文本解析 (VsTP):**
    *   文本定位 (检测和识别文本)
    *   关键信息提取 (例如，从表单、收据中提取)
    *   表格识别 (结构和内容)
    *   布局分析 (段落、行、词)
*   **LLM 无关性 (OmniTool):** 可与多种 LLM 配合使用 (GPT-4o, DeepSeek R1, Sonnet 3.5, Qwen, Olama 模型等)。
	*   **开源且免费:** OmniParser 和 OmniTool 都是 100% 免费和开源的。
	*   **结构化输出:** 将视觉信息转换为结构化格式（例如 JSON），使其机器可读。
	*   **改进的图标和元素检测:** V2 显著增强了检测应用内较小 UI 元素和图标的能力。
	*   **高性能:** 在 VsTP 基准测试中达到最先进或具有竞争力的结果（例如，在 ScreenSpotPro 上使用 GPT-4o 达到 39.6 的平均准确率）。

## 核心技术 (OmniParser V2)

*   **结构化思维点 (SPOT) 提示:** 一种两阶段生成策略。
    1.  生成结构化点序列（文本片段的中心点 + 结构化令牌）。
    2.  使用基于令牌路由的共享解码器为每个点预测多边形/内容。
    这提高了可解释性和性能，类似于视觉解析的思维链 (Chain-of-Thought)。
*   **统一的编码器-解码器架构:** 单一架构处理多个 VsTP 任务，简化了处理流程。
*   **基于令牌路由的共享解码器:** 一种简化的混合专家 (MoE) 设计，通过显式监督令牌路由到专门的 FFN（结构化、检测、识别），从而减小模型尺寸并提高效率。
*   **预训练策略:** 空间窗口提示和前缀窗口提示增强了空间和语义理解能力。

## 用例演示 (通过 OmniTool)

*   **自动化 Web 任务:** “帮我在 Instacart 上买些牛奶” - 代理打开浏览器，导航到 Instacart，搜索牛奶，添加到购物车（如果未提供凭据，则在登录处停止）。
*   **开发者任务:** “访问 OmniParser GitHub 页面，找到克隆链接，然后打开终端克隆它” - 代理导航网页，复制链接，打开终端，并粘贴克隆命令。
*   **文件系统任务:** “检查磁盘空间” - 代理打开文件资源管理器以显示磁盘使用情况。

## 安装

### 前提条件:

1.  **Git:** 用于克隆代码仓库。
2.  **Python:** (例如，示例中看到的 3.10, 3.12)。
3.  **Conda:** 用于管理 Python 环境。
4.  **Hugging Face 账户和访问令牌:** 用于下载模型/权重。
5.  **(针对 OmniTool)** **Docker Desktop:** 运行 Windows 11 虚拟机所必需。
6.  **(针对 OmniTool)** **Windows 11 企业评估版 ISO:** OmniTool 虚拟机设置所需 (约 6GB)。确保您有足够的磁盘空间（OmniTool 设置可能需要约 20GB 用于虚拟机镜像）。

### 1. OmniParser V2 (解析器和 Gradio 演示)

这将安装核心解析引擎和一个演示程序，以测试其屏幕解析功能。

```bash
# 1. 克隆 OmniParser 代码仓库
git clone https://github.com/microsoft/OmniParser.git
cd OmniParser

# 2. 创建并激活 Conda 环境
conda create -n omi python=3.12 # หรือเวอร์ชัน Python ที่คุณต้องการ
conda activate omi

# 3. 安装依赖项
pip install -r requirements.txt

# 4. 登录 Hugging Face (用于模型/权重下载)
huggingface-cli login
# 出现提示时粘贴您的 Hugging Face 访问令牌

# 5. 确保 V2 权重已下载
# 代码仓库通常包含用于下载必要权重的脚本或命令。
# 来自视频的示例 (可能需要根据仓库结构进行调整):
# rm -rf weights/icon_detect_weights/icon_caption_weights/icon_caption_florence
# (下载/移动特定权重的命令，例如，使用 huggingface-cli download)
# 请参阅 OmniParser GitHub README 以获取精确的权重下载说明。
# 一种常见方法是：
# huggingface-cli download microsoft/OmniParser-v2.0 --local-dir weights --repo-type model

# 6. 运行 OmniParser 的 Gradio 演示 (屏幕解析工具)
python gradio_demo.py
```
通过终端中提供的本地 URL (例如 `http://127.0.0.1:7860`) 访问 Gradio 用户界面。您可以上传图像/截图以查看 OmniParser 的解析能力。

### 2. OmniTool (计算机控制代理)

OmniTool 使用 OmniParser。OmniTool 的设置更为复杂，因为它涉及设置虚拟化的 Windows 环境。

```bash
# OmniTool 位于主 OmniParser 仓库中的一个单独目录中，或者是一个单独的仓库。
# 假设它在克隆的 OmniParser 仓库内：
cd OmniTool # 或 OmniTool 目录的正确路径

# 1. 安装 Docker Desktop (如果尚未安装)。

# 2. 下载 Windows 11 企业评估版 ISO:
#    - 访问微软评估中心。
#    - 接受服务条款。
#    - 下载为期 90 天的试用版英文 (美国) ISO 文件 (约 6GB)。
#    - 将文件重命名为 `custom.iso` 并将其复制到 `OmniParser/omnitool/omnibox/win11iso` 目录 (或 OmniTool README 中指定的目录)。

# 3. 导航到 VM 管理脚本目录 (示例路径)
#    cd OmniParser/omnitool/omnibox/scripts # 路径可能有所不同

# 4. 构建 Docker 容器并将 ISO 安装到存储文件夹
#    这通常涉及运行类似 `manage_vm.sh create` 的脚本
#    此步骤将创建一个虚拟机磁盘镜像，可能很大 (例如 20GB)。

# 5. 管理虚拟机 (启动、停止、删除)
#    ./manage_vm.sh start
#    ./manage_vm.sh stop
#    ./manage_vm.sh delete

# 6. 导航到 OmniTool 的 Gradio 目录 (示例路径)
#    cd OmniParser/omnitool/gradio

# 7. 确保 Conda 环境 (例如 'omi') 已激活
#    conda activate omi

# 8. 启动 OmniTool 服务器 (Python 应用)
#    python app.py --window_host_url localhost:8006 --omniparser_server_url localhost:8000
#    (端口可能有所不同，请检查 OmniTool README)

# 9. 在浏览器中打开终端输出的 URL，设置您的 API 密钥，然后开始与 AI 代理进行交互。
```
**注意：** 由于需要虚拟机，OmniTool 的设置对资源要求更高且更为复杂。请仔细遵循代码仓库 `OmniTool` 部分的特定说明。

## 基本用法

*   **OmniParser (Gradio 演示):**
    *   将图像（截图）上传到 Gradio 界面。
    *   调整参数，如包围盒阈值 (Box Threshold)、IOU 阈值等。
    *   点击“提交 (Submit)”。
    *   查看“图像输出 (Image Output)”（突出显示检测到的元素）和“解析的屏幕元素 (Parsed screen elements)”（结构化文本输出）。

*   **OmniTool (代理演示):**
    *   一旦 OmniTool 服务器和 Windows 虚拟机运行，访问 OmniTool 的 Gradio 用户界面。
    *   输入您的 LLM API 密钥（例如 OpenAI API 密钥）。
    *   用自然语言输入提示，例如，“帮我在 instacart 上买些牛奶。”
    *   AI 代理随后将尝试通过与虚拟机的 GUI 交互来执行任务。

## 高级方面

*   **扩展性 (OmniParser):**
    *   使用 Python `entry_points` 设计了插件架构。
    *   允许开发人员为新文件格式或数据源添加自定义适配器。
*   **性能 (OmniParser):**
    *   针对速度进行了优化（V2 速度提高了 60%）。
    *   可以在 CPU 上运行，但建议为 OmniTool 使用 GPU。
    *   文档可能建议生产环境使用缓存机制和异步处理。
*   **安全性 (OmniTool):**
    *   该工具与您的系统交互，请谨慎操作。
    *   项目可能包含数据脱敏和审计日志的考虑，尤其适用于企业用途。

## 故障排除

*   **OmniParser Diagnose:** `omniparser diagnose` 命令（如果可用）可以帮助检查适配器注册和依赖项。
*   **模板验证错误:** 如果解析失败，请检查错误消息，这些消息通常指向（JSON Schema）模板中的问题或意外的输入数据。
*   **虚拟机问题 (OmniTool):** 确保 Docker Desktop 具有足够的资源，并且 Windows 11 ISO 已正确放置和配置。
*   **依赖冲突:** 严格使用 Conda 环境以避免冲突。

## 结论

OmniParser V2 和 OmniTool 代表了在使 LLM 与 GUI 交互并理解视觉屏幕数据方面的重大进展。OmniParser 提供了高精度和高效率的基础屏幕解析能力，而 OmniTool 则展示了使用该引擎构建强大计算机控制代理的潜力。其开源性质欢迎社区贡献并推动该激动人心领域的进一步发展。