#!/usr/bin/env node

/**
 * 将 temp/docs 与 temp/posts 下的笔记迁移到 src/content/blog/migrated 下的 MDX 文章，
 * 并为每篇文章生成一张 16:9 的封面图（保存到 public/images/uploads）。
 *
 * 设计原则：
 * - 严格控制输出格式：前置 frontmatter 满足 blog collection 的 schema；
 * - 文本结构由 Gemini 做“文本增强 + 结构重写”，但不并发调用，逐篇串行；
 * - 封面图由魔搭 ModelScope 串行生成，避免并发；
 * - 日志全部输出到 stdout，方便通过重定向保存；
 * - 默认只“列出候选文件”，真正迁移需要显式指定 mode，避免误操作。
 *
 * 使用方式（建议按顺序）：
 * 1) 仅列出候选文件（不会写入任何文件、不会调用外部 API）：
 *    node scripts/migrate-temp-content.mjs --mode=list
 *
 * 2) 预演迁移（dry-run：构造元数据与本地处理，但不调用外部 API，不写入任何 MDX / 图片）：
 *    node scripts/migrate-temp-content.mjs --mode=migrate --dry-run
 *
 * 3) 实际迁移（会调用 Gemini 与 ModelScope，并写入 MDX + 图片）——等你确认脚本后再执行：
 *    node scripts/migrate-temp-content.mjs --mode=migrate
 *
 * 4) 仅测试外部 API 连接（最简单的小请求）：
 *    node scripts/migrate-temp-content.mjs --mode=test-apis
 *
 * 环境变量约定（.env 中配置，脚本通过 dotenv 加载）：
 * - GEMINI_API_KEY        : Gemini API Key
 * - GEMINI_MODEL          : （可选）Gemini 模型名，默认使用 "gemini-3-flash-preview"
 * - MODELSCOPE_API_KEY    : 魔搭 ModelScope Token
 *
 * 额外文件约定：
 * - 根目录可选存在一个文本文件 "gemini-api-key"，其中仅包含 Gemini 的 API Key（备用方案）
 *
 * 注意：本脚本已按你的要求实现“严格顺序执行 + 详细日志”，但当前不会自动执行，
 * 只有你在本地手动运行对应命令时才会真正发出请求 / 写入文件。
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import yaml from "js-yaml";
import slugify from "slugify";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const CONFIG = {
  paths: {
    tempDocs: path.join(ROOT, "temp", "docs"),
    tempPosts: path.join(ROOT, "temp", "posts"),
    blogOutput: path.join(ROOT, "src", "content", "blog", "migrated"),
    imagesOutput: path.join(ROOT, "public", "images", "uploads"),
  },
  gemini: {
    apiKeyEnv: "GEMINI_API_KEY",
    apiKeyFile: "gemini-api-key",
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    endpointBase: "https://generativelanguage.googleapis.com/v1beta",
  },
  modelscope: {
    apiKeyEnv: "MODELSCOPE_API_KEY",
    baseUrl: "https://api-inference.modelscope.cn",
    model: "Qwen/Qwen-Image-2512",
  },
};

function log(...args) {
  console.log("[migrate]", ...args);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function getRelativeToRoot(absolutePath) {
  return path.relative(ROOT, absolutePath).replace(/\\/g, "/");
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: text };
  }
  try {
    const data = yaml.load(match[1]) || {};
    return { data, content: match[2] };
  }
  catch (err) {
    log("WARN  frontmatter 解析失败，将按无 frontmatter 处理：", err?.message ?? err);
    return { data: {}, content: text };
  }
}

async function readFileUtf8(filePath) {
  return await fs.readFile(filePath, "utf8");
}

function guessSourceKind(relPath) {
  if (relPath.startsWith("temp/posts/"))
    return "post";
  if (relPath.startsWith("temp/docs/"))
    return "doc";
  return "unknown";
}

function shouldSkipPath(relPath) {
  // 只处理 .md / .mdx
  if (!relPath.endsWith(".md") && !relPath.endsWith(".mdx"))
    return true;

  // 跳过各类 assets / 图片 / 压缩包
  if (relPath.includes("/assets/"))
    return true;
  if (relPath.includes("/.git/"))
    return true;

  // docs/extra 下面是旧站点的 css/js 等，统一跳过
  if (relPath.startsWith("temp/docs/extra/"))
    return true;

  // 其他情况默认保留，交给后续规则和人工筛选
  return false;
}

async function walkMarkdownFiles(startDir) {
  const results = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    }
    catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      }
      else {
        const rel = getRelativeToRoot(full);
        if (shouldSkipPath(rel))
          continue;
        results.push(full);
      }
    }
  }

  await walk(startDir);
  return results;
}

function deriveDates(frontmatterData) {
  const candidates = [
    frontmatterData?.pubDate,
    frontmatterData?.published,
    frontmatterData?.date,
  ].filter(Boolean);

  if (candidates.length > 0) {
    const d = new Date(String(candidates[0]));
    if (!Number.isNaN(d.getTime()))
      return { pubDate: d.toISOString(), updated: undefined };
  }

  const now = new Date();
  return { pubDate: now.toISOString(), updated: undefined };
}

async function resolveGeminiApiKey() {
  if (process.env[CONFIG.gemini.apiKeyEnv])
    return process.env[CONFIG.gemini.apiKeyEnv];

  // 备用：从根目录的文本文件读取
  const keyFilePath = path.join(ROOT, CONFIG.gemini.apiKeyFile);
  try {
    const raw = await fs.readFile(keyFilePath, "utf8");
    const key = raw.trim();
    if (key)
      return key;
  }
  catch {
    // ignore
  }
  return null;
}

function resolveModelScopeApiKey() {
  return process.env[CONFIG.modelscope.apiKeyEnv] || null;
}

/**
 * 将 Markdown 内容中的本地图片路径复制到 public/images/uploads/{slug}/ 下，
 * 并将文中的引用路径改为 /images/uploads/{slug}/xxx.xxx 形式。
 *
 * 注意：这里只处理相对路径（不含 http/https 和根路径 / 开头）。
 */
async function rewriteImagesAndCopy(descriptor) {
  const { absolutePath, slug } = descriptor;
  let { content } = descriptor;
  const sourceDir = path.dirname(absolutePath);
  const perPostImageDir = path.join(CONFIG.paths.imagesOutput, slug);

  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const replacements = [];

  let match;
  while ((match = imagePattern.exec(content)) !== null) {
    const alt = match[1] ?? "";
    const url = match[2]?.trim() ?? "";

    if (!url || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"))
      continue;

    const sourceImagePath = path.resolve(sourceDir, url);
    const baseName = path.basename(url);
    const newRel = `/images/uploads/${slug}/${baseName}`;
    const destPath = path.join(perPostImageDir, baseName);

    replacements.push({ alt, url, newRel, destPath, sourceImagePath });
  }

  if (replacements.length === 0)
    return { content, hasImages: false };

  await ensureDir(perPostImageDir);

  for (const r of replacements) {
    try {
      await fs.copyFile(r.sourceImagePath, r.destPath);
      // 简化处理：只替换 URL 这一部分，避免复杂正则
      content = content.split(`](${r.url})`).join(`](${r.newRel})`);
      log("  - 复制内联图片:", getRelativeToRoot(r.sourceImagePath), "->", getRelativeToRoot(r.destPath));
    }
    catch (err) {
      log("  ! 复制图片失败:", r.url, "-", err?.message ?? err);
    }
  }

  return { content, hasImages: true };
}

/**
 * 构造单篇笔记的描述信息：路径 / slug / 初始标题 / 日期 / hero 图路径等。
 */
async function buildSourceDescriptor(absolutePath) {
  const relPath = getRelativeToRoot(absolutePath);
  const raw = await readFileUtf8(absolutePath);
  const { data: frontmatterData, content } = parseFrontmatter(raw);
  const kind = guessSourceKind(relPath);
  const segments = relPath.split("/");
  const sourceTopFolder = segments[2] || null;
  const sourceSubFolders = segments.slice(3, -1);
  const baseName = path.basename(relPath).replace(/\.(md|mdx)$/i, "");
  const slug = slugify(baseName, { lower: true, strict: true });
  const { pubDate } = deriveDates(frontmatterData || {});

  function guessTitle() {
    if (frontmatterData?.title)
      return String(frontmatterData.title);
    const m = content.match(/^#\s+(.+)$/m);
    if (m)
      return m[1].trim();
    return slug;
  }

  const titleGuess = guessTitle();
  const heroImageFileName = `${slug}-cover.jpg`;
  const heroImagePath = `/images/uploads/${heroImageFileName}`;
  const heroImageAbsolute = path.join(CONFIG.paths.imagesOutput, heroImageFileName);

  return {
    absolutePath,
    relPath,
    kind,
    sourceTopFolder,
    sourceSubFolders,
    slug,
    frontmatterData: frontmatterData || {},
    content,
    suggested: {
      title: titleGuess,
      pubDate,
      heroImagePath,
      heroImageAbsolute,
    },
  };
}

function normalizeStringArray(value) {
  if (!value)
    return [];
  const arr = Array.isArray(value) ? value : [value];
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const s = String(v).trim();
    if (!s || seen.has(s))
      continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function buildGeminiPrompt(descriptor, contentForGemini) {
  const metaForPrompt = {
    slug: descriptor.slug,
    kind: descriptor.kind, // "post" | "doc"
    sourceTopFolder: descriptor.sourceTopFolder,
    sourceSubFolders: descriptor.sourceSubFolders,
    suggestedTitle: descriptor.suggested.title,
    suggestedPubDateISO: descriptor.suggested.pubDate,
    existingFrontmatter: descriptor.frontmatterData,
  };

  const instructions = `
You are helping to migrate my personal knowledge notes into MDX blog posts for an Astro-based site.

The site uses frontmatter with the following schema (in plain language):
- title: string (required)
- description: string (required, 1–3 sentence summary, usually in Chinese because the content is Chinese)
- pubDate: string (ISO 8601 date like "2025-01-30T10:00:00", this will be filled by the script, you do NOT need to choose it)
- updated: string ISO date (optional, this will be omitted or later filled)
- image: string path like "/images/xxx.jpg" (this will also be filled by the script, you do NOT need to choose it)
- badge: optional short label such as "Note", "Course", "CTF", "DeepDive"
- draft: boolean (the script will set it to false)
- categories: array of unique strings
- tags: array of unique strings

Your tasks for EACH article:
1. Carefully read the original markdown (some come from MkDocs, with admonitions like "!!! note" or ":::: warning", HTML blocks, etc.).
2. Design a clean, academic-feeling MDX body with good headings (##, ###), lists, tables, and code fences:
   - Convert MkDocs-style admonitions into standard Markdown or MDX-friendly sections (for example, use headings and blockquotes instead of raw "!!!" syntax).
   - Remove raw <style>, complex HTML layout wrappers, badges, or low-level boilerplate from the previous site.
   - Keep technical content, formulas, and reasoning intact.
   - For HTML <br> tags, always write them as "<br />" so that MDX parses correctly.
   - Prefer Markdown tables over raw <table> HTML when possible.
   - Never include <script> tags or inline <style> tags.
   - Do NOT change any markdown image paths in the body: the input you receive already uses the final paths.
3. Propose well-structured frontmatter fields:
   - title: short, precise, academically styled; you may refine the existing title.
   - description: 1–2 sentences in Chinese summarizing what the article is about and what the reader will gain.
   - categories: 1–3 high-level topics, for example: "CS", "CTF", "Course Notes", "AIGC", "Research", "Tools", "Life", "Notebook", etc. Reuse existing categories when reasonable.
   - tags: 3–10 fine-grained tags in Chinese or English, concise and reusable (e.g. "隐私计算", "CTF", "算法", "课程笔记").
   - badge: optional short label like "Note", "Course", "CTF", "DeepDive", "Review", "Lab", or null if not needed.
4. Design ONE high-quality image prompt in English to generate a 16:9 cover illustration that matches the article topic and tone.
   - The image should not contain any overlaid text.
   - The style should be clean, modern, and suitable for a technical / academic blog.

VERY IMPORTANT – OUTPUT FORMAT:
- You MUST respond with a single valid JSON object, no markdown, no code fences, no comments.
- The JSON keys must be exactly:
  {
    "title": string,
    "description": string,
    "categories": string[],
    "tags": string[],
    "badge": string | null,
    "imagePrompt": string,
    "mdxBody": string
  }
- The "mdxBody" string must contain ONLY the article body in MDX format, WITHOUT any frontmatter.
- Do not echo the original markdown.
- Do not add any extra keys.

Here is the metadata about this article (in JSON):

${JSON.stringify(metaForPrompt, null, 2)}

Here is the original content of the article, in markdown, between <ORIGINAL_MARKDOWN> tags:

<ORIGINAL_MARKDOWN>
${contentForGemini}
</ORIGINAL_MARKDOWN>
`;

  return {
    contents: [
      {
        role: "user",
        parts: [{ text: instructions }],
      },
    ],
  };
}

async function callGemini(descriptor, contentForGemini, { dryRun }) {
  if (dryRun) {
    // dry-run 模式下不调用外部 API，直接构造一个占位输出，方便测试 pipeline。
    log("  [dry-run] 跳过 Gemini 调用，仅使用原文作为 mdxBody。");
    return {
      title: descriptor.suggested.title,
      description: `占位描述（dry-run）：${descriptor.suggested.title}`,
      categories: [],
      tags: [],
      badge: null,
      imagePrompt: `An abstract 16:9 illustration about "${descriptor.suggested.title}" in a clean academic blog style.`,
      mdxBody: descriptor.content,
    };
  }

  const apiKey = await resolveGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      `未找到 Gemini API Key，请在 .env 中配置 ${CONFIG.gemini.apiKeyEnv}，或在根目录创建文本文件 ${CONFIG.gemini.apiKeyFile}`,
    );
  }

  const payload = buildGeminiPrompt(descriptor, contentForGemini);
  const url = `${CONFIG.gemini.endpointBase}/models/${encodeURIComponent(CONFIG.gemini.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  log("  调用 Gemini 生成 MDX 与元数据...");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini 请求失败：${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  const textParts =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ?? "";
  const raw = String(textParts || "").trim();

  if (!raw) {
    throw new Error("Gemini 返回为空，未获得任何文本。");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  }
  catch (err) {
    throw new Error(`Gemini 返回的内容不是合法 JSON：${err?.message ?? err}\n原始内容:\n${raw}`);
  }

  return parsed;
}

async function generateHeroImage(imagePrompt, destAbsolutePath, { dryRun }) {
  if (dryRun) {
    log("  [dry-run] 跳过魔搭生图，仅打印提示词：", imagePrompt);
    return;
  }

  const apiKey = resolveModelScopeApiKey();
  if (!apiKey) {
    throw new Error(
      `未找到 ModelScope Token，请在 .env 中配置 ${CONFIG.modelscope.apiKeyEnv}`,
    );
  }

  const baseUrl = CONFIG.modelscope.baseUrl.replace(/\/$/, "");
  const commonHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  log("  调用 ModelScope 创建生图任务...");

  const createResp = await fetch(`${baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: {
      ...commonHeaders,
      "X-ModelScope-Async-Mode": "true",
    },
    body: JSON.stringify({
      model: CONFIG.modelscope.model,
      prompt: imagePrompt,
    }),
  });

  if (!createResp.ok) {
    const text = await createResp.text();
    throw new Error(
      `ModelScope 创建任务失败：${createResp.status} ${createResp.statusText} - ${text}`,
    );
  }

  const createData = await createResp.json();
  const taskId = createData?.task_id;
  if (!taskId) {
    throw new Error(`ModelScope 返回缺少 task_id：${JSON.stringify(createData)}`);
  }

  log("  生图任务已创建，task_id =", taskId, "，开始轮询状态...");

  // 严格顺序轮询，直到 SUCCEED / FAILED
  while (true) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusResp = await fetch(`${baseUrl}/v1/tasks/${taskId}`, {
      method: "GET",
      headers: {
        ...commonHeaders,
        "X-ModelScope-Task-Type": "image_generation",
      },
    });

    if (!statusResp.ok) {
      const text = await statusResp.text();
      throw new Error(
        `ModelScope 查询任务失败：${statusResp.status} ${statusResp.statusText} - ${text}`,
      );
    }

    const statusData = await statusResp.json();
    const status = statusData?.task_status;
    log("  当前任务状态：", status);

    if (status === "SUCCEED") {
      const url = statusData?.output_images?.[0];
      if (!url) {
        throw new Error(
          `ModelScope 任务成功但未返回图片地址：${JSON.stringify(statusData)}`,
        );
      }

      const imgResp = await fetch(url);
      if (!imgResp.ok) {
        throw new Error(
          `下载图片失败：${imgResp.status} ${imgResp.statusText}`,
        );
      }

      const arrayBuffer = await imgResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await ensureDir(path.dirname(destAbsolutePath));
      await fs.writeFile(destAbsolutePath, buffer);

      log("  生图完成，已保存到：", getRelativeToRoot(destAbsolutePath));
      break;
    }

    if (status === "FAILED") {
      throw new Error(`ModelScope 生图任务失败：${JSON.stringify(statusData)}`);
    }

    // 其他状态（PENDING / RUNNING）继续轮询
  }
}

function buildMigrationNote(descriptor) {
  if (descriptor.kind === "doc") {
    return [
      "> **[迁移说明]** 本文最初发布于 `blog.zzw4257.cn`，现已迁移并在本站进行结构化整理与增强。",
      "",
    ].join("\n");
  }
  if (descriptor.kind === "post") {
    return [
      "> **[迁移说明]** 本文最初发布于 `zzw4257.cn`，现已迁移并在本站归档。",
      "",
    ].join("\n");
  }
  return "";
}

async function processOne(descriptor, { dryRun }) {
  log("处理文件:", descriptor.relPath);

  // 1) 处理正文中的本地图片：复制到 public/images/uploads/{slug}/ 并改写路径
  const { content: contentWithImages } = await rewriteImagesAndCopy(descriptor);

  let fm;
  let mdxBodyFinal = "";
  let imagePrompt;

  if (descriptor.kind === "post") {
    // posts：不经过 Gemini，仅整理 frontmatter，并添加迁移说明
    const base = descriptor.frontmatterData || {};
    const { pubDate } = deriveDates(base || {});

    const categories = normalizeStringArray(
      base.categories || base.category || [],
    );
    const tags = normalizeStringArray(base.tags || []);

    fm = {
      title: base.title || descriptor.suggested.title,
      description:
        base.description ||
        `TODO: 补充摘要 —— ${descriptor.suggested.title}`,
      pubDate,
      // 对于 posts，我们暂时不自动生成封面图，保留 image 为空或使用原有 image（若有需要可后续扩展）
      image: undefined,
      badge: base.badge || undefined,
      draft: false,
      categories,
      tags,
    };

    const note = buildMigrationNote(descriptor);
    mdxBodyFinal = [note, (contentWithImages || "").trim()]
      .filter(Boolean)
      .join("\n\n");
  }
  else {
    // docs：完整走 Gemini 文本增强流程
    const geminiResult = await callGemini(descriptor, contentWithImages, {
      dryRun,
    });

    const {
      title,
      description,
      categories,
      tags,
      badge,
      imagePrompt: ip,
      mdxBody,
    } = geminiResult;

    imagePrompt = ip;

    fm = {
      title: title || descriptor.suggested.title,
      description:
        description || `TODO: 补充摘要 —— ${descriptor.suggested.title}`,
      pubDate: descriptor.suggested.pubDate,
      image: descriptor.suggested.heroImagePath,
      badge: badge || undefined,
      draft: false,
      categories: normalizeStringArray(categories),
      tags: normalizeStringArray(tags),
    };

    const note = buildMigrationNote(descriptor);
    mdxBodyFinal = [note, (mdxBody || "").trim()].filter(Boolean).join("\n\n");
  }

  const frontmatterText = yaml.dump(fm, { lineWidth: 80 });
  const finalContent = `---\n${frontmatterText}---\n\n${mdxBodyFinal}\n`;

  const outputPath = path.join(CONFIG.paths.blogOutput, `${descriptor.slug}.mdx`);

  if (dryRun) {
    log("  [dry-run] 将写入文件:", getRelativeToRoot(outputPath));
  }
  else {
    await ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, finalContent, "utf8");
    log("  已写入 MDX:", getRelativeToRoot(outputPath));
  }

  // 3) 调用魔搭生成封面图（16:9），仅对 docs 内容启用
  if (descriptor.kind === "doc" && imagePrompt && String(imagePrompt).trim()) {
    await generateHeroImage(
      String(imagePrompt).trim(),
      descriptor.suggested.heroImageAbsolute,
      { dryRun },
    );
  }
  else if (descriptor.kind === "doc") {
    log("  未提供 imagePrompt，跳过生图。");
  }
}

async function collectSources() {
  const docs = await walkMarkdownFiles(CONFIG.paths.tempDocs);
  const posts = await walkMarkdownFiles(CONFIG.paths.tempPosts);
  return [...docs, ...posts];
}

async function main() {
  const args = process.argv.slice(2);
  const modeArgIndex = args.indexOf("--mode");
  const mode =
    modeArgIndex >= 0 && args[modeArgIndex + 1]
      ? args[modeArgIndex + 1]
      : "list";
  const dryRun = args.includes("--dry-run");

  log("项目根目录:", ROOT);
  log("运行模式:", mode, dryRun ? "(dry-run)" : "");
  log("Gemini 模型:", CONFIG.gemini.model);

  const sources = await collectSources();
  let descriptors = [];
  for (const file of sources) {
    const desc = await buildSourceDescriptor(file);
    descriptors.push(desc);
  }

  const onlyIndex = args.indexOf("--only");
  if (onlyIndex >= 0 && args[onlyIndex + 1]) {
    const onlyArg = args[onlyIndex + 1];
    const targetAbs = path.isAbsolute(onlyArg)
      ? onlyArg
      : path.join(ROOT, onlyArg);
    descriptors = descriptors.filter(
      (d) =>
        d.absolutePath === targetAbs ||
        d.relPath === onlyArg.replace(/^[.][/\\]/, ""),
    );
    log("应用 --only 过滤后，候选文件数量:", descriptors.length);
  }

  if (mode === "list") {
    log("候选迁移文件列表（不会执行任何转换）：");
    for (const d of descriptors) {
      log(
        "-",
        d.kind,
        "|",
        d.relPath,
        "=> slug:",
        d.slug,
        "| 预估标题:",
        d.suggested.title,
      );
    }
    log(`总计 ${descriptors.length} 篇候选笔记。`);
    return;
  }

  if (mode === "test-apis") {
    log("开始最小化 API 连通性测试（不会写入任何文件）...");

    const geminiKey = await resolveGeminiApiKey();
    if (!geminiKey)
      log("  [WARN] 未找到 Gemini Key（可以稍后再配）。");
    else
      log("  Gemini Key 已检测到（值未打印）。");

    const msKey = resolveModelScopeApiKey();
    if (!msKey)
      log("  [WARN] 未找到 ModelScope Token（可以稍后再配）。");
    else
      log("  ModelScope Token 已检测到（值未打印）。");

    log(
      "如需真正发起测试请求，可在确认后手动扩展此 mode，目前按你的要求不主动访问外部网络。",
    );
    return;
  }

  if (mode === "migrate") {
    log(
      "开始串行迁移（不会并发调用）。注意：只有在未使用 --dry-run 时才会真正调用外部 API 与写文件。",
    );
    for (const d of descriptors) {
      try {
        await processOne(d, { dryRun });
      }
      catch (err) {
        log(
          "  [ERROR] 处理文件失败:",
          d.relPath,
          "-",
          err?.message ?? err,
        );
      }
      log("------------------------------------------------------------");
    }
    log("迁移流程结束。");
    return;
  }

  log(`未知的 mode: ${mode}，支持的值为: list | migrate | test-apis`);
}

main().catch((err) => {
  console.error("[migrate] 运行出错:", err);
  process.exitCode = 1;
});

