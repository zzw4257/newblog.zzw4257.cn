#!/usr/bin/env node

/**
 * 使用 Nano Banana (Gemini API) 为文章生成封面图
 * 
 * 使用方式：
 *   node scripts/generate-covers-nanobanana.mjs
 * 
 * 环境变量：
 *   GEMINI_API_KEY: Gemini API Key
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

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

// 文章配置：文件名 -> { 标题, 描述, 封面路径, 提示词, 文件路径 }
const articles = [
  // 算力杂谈系列（5篇）
  {
    filename: "calculating-power.mdx",
    filePath: "src/content/blog/calculating-power.mdx",
    title: "算力杂谈：从微观算子到宏观架构",
    description: "深度解析2026年算力格局，从RTX 5090、H200到Apple M4 Max的架构差异，以及底层FLOPs与内存墙的本质探讨。",
    coverPath: "/images/compute-2026.jpg",
    prompt: "Create a futuristic, high-tech cover image showing GPU architecture comparison: RTX 5090, H200, and Apple M4 Max. The image should feature modern computer hardware, circuit patterns, and performance metrics. Style: clean, professional, tech-focused, with blue and purple gradients. Horizontal landscape format."
  },
  {
    filename: "cp1.mdx",
    filePath: "src/content/blog/cp1.mdx",
    title: "算力杂谈 (Ep.1)：众神殿的战争 —— 2026 算力格局深度横评",
    description: "这是一个算力过剩又极度匮乏的时代。我们在 RTX 5090 的 GDDR7 和 H200 的 HBM3e 之间，寻找 AI 基础设施的最优解。",
    coverPath: "/images/gpu-architecture-2026.jpg",
    prompt: "Create a dramatic, epic cover image representing the battle of GPU architectures in 2026. Show RTX 5090, H200, and M4 Max as powerful technological entities in a futuristic landscape. Include elements like GDDR7 and HBM3e memory technologies. Style: epic, cinematic, tech-warfare aesthetic with golden and blue tones. Horizontal landscape format."
  },
  {
    filename: "cp2.mdx",
    filePath: "src/content/blog/cp2.mdx",
    title: "算力杂谈 (Ep.2)：微观的物理学 —— 1801 TOPS 与 56 TFLOPS 的罗生门",
    description: "你手中的 RTX 5080 标称 1801 AI TOPS，但 FP32 只有 56.3 TFLOPS。这巨大的倍数差是从哪里来的？",
    coverPath: "/images/tensor-core-micro.jpg",
    prompt: "Create a detailed, microscopic view of GPU Tensor Core architecture. Show the internal structure of computing units, with numbers 1801 TOPS and 56 TFLOPS visible. Include visual representations of FP4, FP8, and FP32 precision levels. Style: scientific, detailed, technical illustration with neon blue and green colors. Horizontal landscape format."
  },
  {
    filename: "cp3.mdx",
    filePath: "src/content/blog/cp3.mdx",
    title: "算力杂谈 (Ep.3)：内存墙的叹息 —— GDDR7、HBM3e 与统一内存的殊途同归",
    description: "为什么 M4 Pro 算力只有 5080 的零头，却能跑 5080 跑不了的大模型？一切的答案都在带宽公式里。",
    coverPath: "/images/memory-wall-2026.jpg",
    prompt: "Create a conceptual cover image representing the memory wall problem. Show GDDR7, HBM3e, and unified memory architectures as different paths up a wall. Include visual metaphors of data flow, bandwidth, and memory hierarchy. Style: conceptual, abstract, with purple and orange gradients representing different memory technologies. Horizontal landscape format."
  },
  {
    filename: "cp4.mdx",
    filePath: "src/content/blog/cp4.mdx",
    title: "算力杂谈 (Ep.4)：木桶的短板 —— CPU、PCIe 拓扑与系统级瓶颈",
    description: "显卡买得再好，插在 PCIe x4 插槽上也跑不起来。从主板拓扑到硬盘 IO，排查那些拖慢 RTX 5080 的\"猪队友\"。",
    coverPath: "/images/pcie-topology.jpg",
    prompt: "Create a technical cover image showing computer system architecture: CPU, PCIe slots, motherboard topology, and data flow paths. Include visual representation of bottlenecks and system bottlenecks. Show RTX 5080 GPU connected via PCIe. Style: technical diagram, clean, professional, with red and blue color coding for bottlenecks. Horizontal landscape format."
  },
  // 需要修复的迁移文章（6篇）
  {
    filename: "curricular-inprivarycomputingfinal.mdx",
    filePath: "src/content/blog/migrated/curricular-inprivarycomputingfinal.mdx",
    title: "隐私计算与安全多方计算：课程笔记深度汇总",
    description: "本文详尽总结了隐私计算与安全多方计算（MPC）的理论体系，涵盖秘密分享、OT 协议、混淆电路及恶意安全模型等核心内容。",
    coverPath: "/images/uploads/curricular-inprivarycomputingfinal-cover.jpg",
    prompt: "Create a comprehensive cover image representing privacy computing and secure multi-party computation (MPC). Show abstract concepts of secret sharing, cryptographic protocols, and secure computation. Include visual elements like encrypted data flows, mathematical formulas, and security shields. Style: academic, professional, with blue and green tones representing security and privacy. Horizontal landscape format."
  },
  {
    filename: "privacy-computing-chap3.mdx",
    filePath: "src/content/blog/migrated/privacy-computing-chap3.mdx",
    title: "隐私计算第3章：基于Shamir秘密分享的MPC协议示例",
    description: "本章通过一个具体的例子介绍具有完美隐私性的通用安全多方计算协议，核心构建模块是Shamir秘密分享方案。",
    coverPath: "/images/uploads/curricular-3-an-example-of-secure-multi-party-computation-protocol-chap3-mpcexample-cover.jpg",
    prompt: "Create a cover image illustrating Shamir secret sharing scheme for secure multi-party computation. Show mathematical concepts like Lagrange interpolation, polynomial curves, and secret reconstruction. Include visual representation of distributed secrets and secure computation. Style: mathematical, technical, with purple and blue gradients. Horizontal landscape format."
  },
  {
    filename: "privacy-computing-chap4.mdx",
    filePath: "src/content/blog/migrated/privacy-computing-chap4.mdx",
    title: "隐私计算第4章：安全模型与通用可组合性框架",
    description: "本章引入形式化的密码学安全模型——通用可组合性框架（UC framework），包括半诚实与恶意敌手模型。",
    coverPath: "/images/uploads/curricular-4-security-models-chap4-securitymodel-cover.jpg",
    prompt: "Create a cover image representing the Universal Composability (UC) framework and security models. Show abstract concepts of ideal world vs real world, adversary models, and formal security definitions. Include visual metaphors of security proofs and cryptographic frameworks. Style: abstract, theoretical, with dark blue and gold tones. Horizontal landscape format."
  },
  {
    filename: "privacy-computing-chap6.mdx",
    filePath: "src/content/blog/migrated/privacy-computing-chap6.mdx",
    title: "隐私计算第6章：基于线性秘密分享的协议（BGW与GMW）",
    description: "本章深入探讨基于线性秘密分享方案（LSSS）的经典MPC协议，包括BGW协议和GMW协议。",
    coverPath: "/images/uploads/privacy-computing-chap6-cover.jpg",
    prompt: "Create a cover image representing BGW and GMW protocols based on linear secret sharing schemes (LSSS). Show visual concepts of information-theoretic security, computational security, and multi-party protocols. Include abstract representations of secret sharing matrices and protocol flows. Style: technical, academic, with indigo and cyan colors. Horizontal landscape format."
  },
  {
    filename: "software-security-format-string.mdx",
    filePath: "src/content/blog/migrated/software-security-format-string.mdx",
    title: "格式化字符串攻击：从栈帧布局到任意内存读写",
    description: "本文深入解析格式化字符串漏洞的底层机制，包括可变参数函数、栈帧布局、va_list工作原理。",
    coverPath: "/images/uploads/software-security-format-string-cover.jpg",
    prompt: "Create a cover image representing format string vulnerability attacks. Show stack frame layouts, memory structures, and exploitation techniques. Include visual elements of buffer overflow, GOT hijacking, and memory corruption. Style: technical, security-focused, with red and dark tones representing vulnerabilities. Horizontal landscape format."
  },
  {
    filename: "software-security-sql-injection.mdx",
    filePath: "src/content/blog/migrated/software-security-sql-injection.mdx",
    title: "SQL 注入攻击：从基础原理到实战利用",
    description: "本文系统介绍 SQL 注入的核心概念、SQL 语法特性、Web 应用与数据库交互原理。",
    coverPath: "/images/uploads/software-security-sql-injection-cover.jpg",
    prompt: "Create a cover image representing SQL injection attacks. Show database structures, SQL queries, web application architecture, and injection vectors. Include visual elements of database security, authentication bypass, and data extraction. Style: technical, web security focused, with orange and dark blue tones. Horizontal landscape format."
  }
];

async function generateCover(article) {
  console.log(`\n🎨 正在为 "${article.title}" 生成封面图...`);
  console.log(`   提示词: ${article.prompt.substring(0, 80)}...`);
  
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
    
    return true;
  } catch (error) {
    console.error(`❌ 生成封面图失败: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("🎨 使用 Nano Banana (Gemini API) 生成文章封面图");
  console.log("=".repeat(80));
  console.log(`📝 共 ${articles.length} 篇文章需要生成封面图\n`);

  let successCount = 0;
  let failCount = 0;

  for (const article of articles) {
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
