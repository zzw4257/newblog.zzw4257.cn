# 简历页面设计方案

## 一、整体架构

### 1.1 页面结构
```
/resume
  ├── /edit (编辑模式)
  └── / (展示模式，默认)
```

### 1.2 数据存储
- 存储位置：`src/content/resume/resume.yaml` 或 `public/resume/resume.json`
- 数据结构：YAML 格式，便于编辑和版本控制

### 1.3 组件架构
```
resume/
  ├── ResumeEditPage.tsx (编辑页面，类似 WritePage)
  ├── ResumeDisplayPage.astro (展示页面)
  ├── components/
  │   ├── ResumeEditor.tsx (编辑器组件)
  │   ├── ResumeViewer.astro (展示组件)
  │   ├── sections/
  │   │   ├── PersonalInfo.astro
  │   │   ├── Education.astro
  │   │   ├── Experience.astro
  │   │   ├── Projects.astro
  │   │   ├── Skills.astro
  │   │   └── Publications.astro
  │   └── actions/
  │       ├── ExportLaTeX.ts
  │       ├── ExportPDF.ts
  │       └── PreviewPDF.ts
  └── stores/
      └── resume-store.ts (状态管理)
```

## 二、设计风格

### 2.1 视觉风格
- **学术风格**：
  - 使用 serif 字体（如：Georgia, "Times New Roman"）用于正文
  - 无衬线字体用于标题和导航
  - 优雅的排版：适当的行距、字距
  - 经典的配色：深色文字、浅色背景（支持深色模式）

- **呼吸感设计**：
  - 充足的留白（padding: 2rem-3rem）
  - 卡片之间的间距：1.5rem-2rem
  - 段落间距：1.5rem
  - 动画：fade-in-up、stagger 动画

- **动态效果**：
  - 页面加载：fade-in-up 动画（0.6s ease-out）
  - 章节进入：stagger 动画（每个元素延迟 0.1s）
  - Hover 效果：轻微阴影变化、颜色过渡
  - 滚动动画：Intersection Observer 触发

### 2.2 布局设计
```
┌─────────────────────────────────────┐
│  Header (固定，半透明背景)            │
│  - 姓名、职位                        │
│  - 联系方式、社交链接                │
│  - 操作按钮（编辑/导出/预览）         │
├─────────────────────────────────────┤
│  Main Content (滚动区域)             │
│  ┌───────────────────────────────┐  │
│  │ Personal Information          │  │
│  │ (头像、基本信息)               │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ Education                      │  │
│  │ (时间线样式)                    │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ Experience                    │  │
│  │ (卡片式，时间线)                │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ Projects                      │  │
│  │ (网格布局)                     │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ Skills                        │  │
│  │ (标签云、技能条)                │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ Publications                  │  │
│  │ (学术论文列表)                  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 2.3 响应式设计
- 移动端：单列布局，紧凑间距
- 平板：双列布局（部分内容）
- 桌面：最大宽度 1200px，居中显示

## 三、功能设计

### 3.1 编辑模式
- **类似 Write 页面的体验**：
  - 左侧：表单编辑器
  - 右侧：实时预览
  - 顶部：保存/取消按钮
  - 底部：导出选项

- **编辑功能**：
  - 分段编辑（Personal Info, Education, Experience 等）
  - 拖拽排序（经历、项目）
  - 富文本编辑（描述部分）
  - 图片上传（头像、项目截图）

### 3.2 展示模式
- **精美的网页展示**：
  - 优雅的排版
  - 流畅的动画
  - 响应式布局
  - 打印友好

### 3.3 导出功能
- **LaTeX 导出**：
  - 使用 moderncv 或自定义模板
  - 生成 .tex 文件
  - 提供下载链接

- **PDF 导出**：
  - 使用浏览器打印 API
  - 或调用后端服务生成 PDF
  - 提供预览和下载

- **预览功能**：
  - PDF 预览：使用 iframe 或 PDF.js
  - LaTeX 预览：显示生成的 LaTeX 代码

## 四、数据结构

### 4.1 YAML 结构
```yaml
personal:
  name: "zzw4257"
  title: "Developer & Tech Enthusiast"
  avatar: "/profile.png"
  email: "zzw4257-809050685@qq.com"
  phone: ""
  location: ""
  website: "https://newblog.zzw4257.cn"
  social:
    - platform: "GitHub"
      url: "https://github.com/zzw4257"
      icon: "ri:github-line"
    - platform: "Email"
      url: "mailto:zzw4257-809050685@qq.com"
      icon: "lucide:mail"

education:
  - degree: "Bachelor's Degree"
    field: "Computer Science"
    institution: "University Name"
    location: "City, Country"
    startDate: "2020-09"
    endDate: "2024-06"
    gpa: "3.8/4.0"
    description: "Relevant coursework, honors, etc."

experience:
  - title: "Software Engineer"
    company: "Company Name"
    location: "City, Country"
    startDate: "2024-01"
    endDate: "present"
    description: |
      - Developed and maintained web applications
      - Collaborated with cross-functional teams
    technologies: ["React", "TypeScript", "Node.js"]

projects:
  - name: "Project Name"
    description: "Project description"
    url: "https://github.com/zzw4257/project"
    technologies: ["React", "TypeScript"]
    highlights:
      - "Achievement 1"
      - "Achievement 2"

skills:
  - category: "Programming Languages"
    items: ["JavaScript", "TypeScript", "Python"]
  - category: "Frameworks"
    items: ["React", "Vue.js", "Astro"]

publications:
  - title: "Paper Title"
    authors: ["Author 1", "Author 2"]
    venue: "Conference/Journal Name"
    year: 2024
    url: "https://example.com/paper"
```

## 五、动画设计

### 5.1 页面加载动画
```css
@keyframes resume-fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.resume-section {
  animation: resume-fade-in-up 0.6s ease-out forwards;
  opacity: 0;
}

.resume-section:nth-child(1) { animation-delay: 0.1s; }
.resume-section:nth-child(2) { animation-delay: 0.2s; }
.resume-section:nth-child(3) { animation-delay: 0.3s; }
/* ... */
```

### 5.2 滚动触发动画
- 使用 Intersection Observer
- 元素进入视口时触发动画
- 平滑的过渡效果

### 5.3 Hover 效果
- 卡片：轻微阴影变化、轻微上移
- 链接：颜色过渡、下划线动画
- 按钮：背景色变化、图标旋转

## 六、技术实现

### 6.1 技术栈
- **前端框架**：Astro + React (编辑模式)
- **样式**：Tailwind CSS + SCSS
- **状态管理**：Zustand (编辑模式)
- **PDF 生成**：jsPDF 或后端服务
- **LaTeX 生成**：模板引擎（Handlebars/Mustache）

### 6.2 关键组件
1. **ResumeEditor**：表单编辑器
2. **ResumeViewer**：展示组件
3. **Section Components**：各个章节组件
4. **Export Utilities**：导出工具函数

## 七、与现有系统集成

### 7.1 路由配置
- 在 `ryuchan.config.yaml` 中添加简历页面配置
- 在菜单中添加简历链接

### 7.2 样式一致性
- 使用相同的 Card 组件
- 使用相同的动画系统
- 使用相同的主题系统

### 7.3 功能复用
- 复用 Write 页面的 GitHub 集成
- 复用图片上传功能
- 复用认证系统

## 八、用户体验

### 8.1 编辑体验
- 实时预览
- 自动保存（本地存储）
- 撤销/重做功能
- 键盘快捷键

### 8.2 展示体验
- 流畅的滚动
- 优雅的动画
- 清晰的层次
- 易于阅读

### 8.3 导出体验
- 一键导出
- 预览功能
- 多种格式选择
- 下载提示
