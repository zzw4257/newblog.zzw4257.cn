#!/usr/bin/env node

/**
 * 为新迁移的 temp/posts 文章生成封面图
 * 使用 Nano Banana (Gemini API)
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import yaml from "js-yaml";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || fs.readFileSync(path.join(ROOT, "gemini-api-key"), "utf-8").trim();

if (!GEMINI_API_KEY) {
  console.error("❌ 错误: 未找到 GEMINI_API_KEY 环境变量或 gemini-api-key 文件");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// 新迁移的文章列表
const articles = [
  { slug: "acee-course-acee2024-acee-homework", title: "ACEE数学建模作业+小测提示(2024版)", category: "ACEE", prompt: "Create a cover image for ACEE mathematical modeling homework and quiz tips. Show mathematical formulas, graphs, and academic study materials. Style: academic, clean, with blue and green tones. Horizontal landscape format." },
  { slug: "acee-course-aceecumcm-c-acee-project", title: "ACEE数学建模项目(CUMCM-C)", category: "ACEE", prompt: "Create a cover image for ACEE mathematical modeling project (CUMCM-C). Show project presentation, mathematical models, and competition elements. Style: professional, academic, with purple and blue gradients. Horizontal landscape format." },
  { slug: "acee-course-acee-acee-review", title: "ACEE数模复习", category: "ACEE", prompt: "Create a cover image for ACEE mathematical modeling review. Show review materials, formulas, and study notes. Style: educational, organized, with warm orange and blue tones. Horizontal landscape format." },
  { slug: "acgn-reader-reader", title: "reader", category: "ACGN", prompt: "Create a cover image for a reader application or reading experience. Show books, reading interface, and literary elements. Style: modern, minimalist, with soft pastel colors. Horizontal landscape format." },
  { slug: "basic-knowledge-chap32-physic2-2", title: "普物二总结Chap32~?磁学部分", category: "Physics", prompt: "Create a cover image for physics chapter on magnetism. Show magnetic fields, field lines, and electromagnetic concepts. Style: scientific, technical, with blue and red colors representing magnetic poles. Horizontal landscape format." },
  { slug: "basic-knowledge-chap3840-physic2-3", title: "普物二总结Chap38~40麦克斯韦方程组+光学", category: "Physics", prompt: "Create a cover image for Maxwell's equations and optics in physics. Show electromagnetic waves, light refraction, and mathematical equations. Style: scientific, elegant, with rainbow spectrum and blue tones. Horizontal landscape format." },
  { slug: "basic-knowledge-physic2-4", title: "普物二光学", category: "Physics", prompt: "Create a cover image for optics in physics. Show light rays, lenses, prisms, and optical phenomena. Style: scientific, colorful, with light spectrum and geometric patterns. Horizontal landscape format." },
  { slug: "basic-knowledge-chap25chap31-physics2-1", title: "普物二总结Chap25~Chap31电学部分", category: "Physics", prompt: "Create a cover image for electricity and electromagnetism in physics. Show circuits, electric fields, and electrical concepts. Style: technical, dynamic, with yellow and blue colors representing electricity. Horizontal landscape format." },
  { slug: "career-career-programming-career-programming", title: "career-programming", category: "Career", prompt: "Create a cover image for programming career development. Show code, career growth, and professional development. Style: modern, tech-focused, with green and blue gradients. Horizontal landscape format." },
  { slug: "cs-zju-ads-algorithm-part-ads-2", title: "ZJU ADS Algorithm Part", category: "CS", prompt: "Create a cover image for algorithm course content. Show data structures, algorithms, and computational thinking. Style: technical, academic, with blue and purple tones. Horizontal landscape format." },
  { slug: "cs-zju-ads-hw-and-project-ads-hwpr", title: "ZJU ADS HW and Project", category: "CS", prompt: "Create a cover image for algorithm and data structure homework and projects. Show coding assignments, projects, and academic work. Style: educational, professional, with orange and blue colors. Horizontal landscape format." },
  { slug: "cs-zju-ads-review-ads-rv", title: "ZJU ADS Review", category: "CS", prompt: "Create a cover image for algorithm and data structure review notes. Show review materials, key concepts, and study guides. Style: academic, organized, with green and blue tones. Horizontal landscape format." },
  { slug: "cs-zju-ads-ds-part-ads", title: "ZJU ADS DS Part", category: "CS", prompt: "Create a cover image for data structures course content. Show trees, graphs, arrays, and data structure visualizations. Style: technical, educational, with blue and cyan colors. Horizontal landscape format." },
  { slug: "ctf-2024-aaa-ctf-2024-aaa-ctf", title: "2024-AAA-CTF", category: "CTF", prompt: "Create a cover image for 2024 AAA CTF competition. Show cybersecurity, hacking, flags, and competition elements. Style: technical, security-focused, with dark tones and neon accents. Horizontal landscape format." },
  { slug: "ctf-112-ctf-writeup-2024dasctf", title: "11.2 CTF省赛 Writeup", category: "CTF", prompt: "Create a cover image for CTF provincial competition writeup. Show cybersecurity challenges, flags, and technical solutions. Style: technical, competitive, with red and black tones. Horizontal landscape format." },
  { slug: "ctf-ctf-ctf", title: "CTF速刷学习", category: "CTF", prompt: "Create a cover image for CTF rapid learning and practice. Show cybersecurity tools, challenges, and learning materials. Style: educational, technical, with dark blue and green neon colors. Horizontal landscape format." },
  { slug: "ctf-91-linux-linux", title: "9.1 更多 Linux 工具", category: "CTF", prompt: "Create a cover image for Linux tools in CTF. Show terminal, command line tools, and Linux system utilities. Style: technical, minimalist, with green terminal aesthetic. Horizontal landscape format." },
  { slug: "guide-fuwari-index", title: "Fuwari 实用向指南", category: "Guides", prompt: "Create a cover image for Fuwari application guide. Show app interface, features, and user-friendly design. Style: modern, clean, with soft pastel colors. Horizontal landscape format." },
  { slug: "e5-af-86-e7-a0-81-e5-ad-a6", title: "密码学", category: "Cryptography", prompt: "Create a cover image for cryptography course. Show encryption, cryptographic algorithms, and security concepts. Style: technical, secure, with dark blue and gold tones. Horizontal landscape format." },
  { slug: "is-pro-123-123", title: "计算机系统1,2,3贯通课程速通大纲", category: "System", prompt: "Create a cover image for computer systems course outline (Systems 1, 2, 3). Show system architecture, hardware, and software layers. Style: technical, comprehensive, with blue and gray tones. Horizontal landscape format." },
  { slug: "startermd-starter", title: "开始", category: "General", prompt: "Create a cover image for a starter or beginning guide. Show starting point, beginning journey, and fresh start concepts. Style: inspiring, clean, with bright and optimistic colors. Horizontal landscape format." },
  { slug: "tech-reveal-md-reveal-md", title: "reveal-md", category: "Tech", prompt: "Create a cover image for reveal-md presentation tool. Show slides, presentations, and markdown-based tools. Style: modern, tech-focused, with blue and white tones. Horizontal landscape format." },
  { slug: "unconcerned-ai-app-ai-app", title: "AI-App", category: "AI", prompt: "Create a cover image for AI applications. Show artificial intelligence, apps, and modern technology. Style: futuristic, tech-focused, with purple and blue gradients. Horizontal landscape format." },
  { slug: "website-guide-to-deploy-a-site", title: "【微指南】救赎你的网站梦", category: "Web", prompt: "Create a cover image for website deployment guide. Show web development, deployment process, and website creation. Style: modern, web-focused, with blue and orange tones. Horizontal landscape format." },
  { slug: "website-webplugins", title: "网站插件二三事", category: "Web", prompt: "Create a cover image for website plugins and extensions. Show plugins, extensions, and web tools. Style: modern, colorful, with vibrant web colors. Horizontal landscape format." },
  { slug: "zjucsa-class4-git", title: "讲稿", category: "Git", prompt: "Create a cover image for Git version control lecture notes. Show Git workflow, branches, and version control concepts. Style: technical, educational, with orange and blue colors. Horizontal landscape format." },
];

async function generateCover(article) {
  console.log(`\n🎨 正在为 "${article.title}" 生成封面图...`);
  console.log(`   Slug: ${article.slug}`);
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: article.prompt,
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    let imageData = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        break;
      }
    }

    if (!imageData) {
      throw new Error("未从响应中获取到图片数据");
    }

    // 保存图片
    const imagePath = article.coverPath.startsWith("/") 
      ? article.coverPath.substring(1) 
      : article.coverPath;
    const fullPath = path.join(ROOT, "public", imagePath);
    const dir = path.dirname(fullPath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const buffer = Buffer.from(imageData, "base64");
    fs.writeFileSync(fullPath, buffer);
    
    console.log(`✅ 封面图已保存: ${fullPath}`);
    console.log(`   文件大小: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    // 更新 MDX 文件的 frontmatter
    const mdxPath = path.join(ROOT, "src/content/blog/migrated", `${article.slug}.mdx`);
    if (fs.existsSync(mdxPath)) {
      const content = fs.readFileSync(mdxPath, "utf-8");
      const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
      
      if (frontmatterMatch) {
        const frontmatter = yaml.load(frontmatterMatch[1]);
        frontmatter.image = article.coverPath;
        
        const newFrontmatter = yaml.dump(frontmatter, { lineWidth: 80 });
        const newContent = `---\n${newFrontmatter}---${content.substring(frontmatterMatch[0].length)}`;
        
        fs.writeFileSync(mdxPath, newContent, "utf-8");
        console.log(`✅ 已更新 MDX frontmatter`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ 生成封面图失败: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("🎨 为新迁移的 temp/posts 文章生成封面图");
  console.log("=".repeat(80));
  console.log(`📝 共 ${articles.length} 篇文章需要生成封面图\n`);

  let successCount = 0;
  let failCount = 0;

  for (const article of articles) {
    article.coverPath = `/images/uploads/${article.slug}-cover.jpg`;
    const success = await generateCover(article);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // 避免请求过快，稍作延迟
    if (articles.indexOf(article) < articles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 生成完成统计");
  console.log("=".repeat(80));
  console.log(`✅ 成功: ${successCount} 张`);
  console.log(`❌ 失败: ${failCount} 张`);
  console.log(`📝 总计: ${articles.length} 张`);
  console.log("=".repeat(80));
}

main().catch(console.error);
