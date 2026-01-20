'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import yaml from 'js-yaml'
import { Toaster, toast } from 'sonner'
import { readTextFileFromRepo, putFile, toBase64Utf8 } from '@/lib/github-client'
import { GITHUB_CONFIG } from '@/consts'
import { getAuthToken } from '@/lib/auth'
import { readFileAsText } from '@/lib/file-utils'
import type { ResumeData } from '@/interface/resume'
import { ResumeViewer } from './ResumeViewer'
import { useAuthStore } from '@/components/write/hooks/use-auth'

const RESUME_PATH = 'src/content/resume/resume.yaml'
const LOCAL_DRAFT_KEY = 'resume_yaml_draft_v1'
const DEFAULT_YAML = `personal:
  name: "zzw4257"
  title: "Developer & Tech Enthusiast"
  avatar: "/profile.png"
  email: "zzw4257-809050685@qq.com"
  phone: ""
  location: ""
  website: "https://newblog.zzw4257.cn"
  bio: "热爱技术的开发者，专注于技术学习和实践，喜欢探索新技术，享受用代码解决问题的过程。"
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
    honors:
      - "Dean's List"
      - "Outstanding Student"

experience:
  - title: "Software Engineer"
    company: "Company Name"
    location: "City, Country"
    startDate: "2024-01"
    endDate: "present"
    description: |
      - Developed and maintained web applications using modern frameworks
      - Collaborated with cross-functional teams to deliver high-quality software
      - Optimized application performance and user experience
    technologies:
      - "React"
      - "TypeScript"
      - "Node.js"
    achievements:
      - "Improved application performance by 40%"
      - "Led a team of 3 developers"

projects:
  - name: "Personal Blog"
    description: "A modern static blog built with Astro and Tailwind CSS"
    url: "https://newblog.zzw4257.cn"
    github: "https://github.com/zzw4257/newblog.zzw4257.cn"
    technologies:
      - "Astro"
      - "TypeScript"
      - "Tailwind CSS"
    highlights:
      - "Online article publishing"
      - "Visual configuration management"
      - "GitHub integration"

skills:
  - category: "Programming Languages"
    items:
      - "JavaScript"
      - "TypeScript"
      - "Python"
    level: "advanced"
  - category: "Frameworks & Libraries"
    items:
      - "React"
      - "Vue.js"
      - "Astro"
      - "Node.js"
    level: "advanced"
  - category: "Tools & Technologies"
    items:
      - "Git"
      - "Docker"
      - "Linux"
    level: "intermediate"

publications: []

languages:
  - name: "Chinese"
    level: "Native"
  - name: "English"
    level: "Fluent"

certifications: []

awards: []
`

export default function ResumeEditPage() {
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const keyInputRef = useRef<HTMLInputElement>(null)
  const { setPrivateKey, isAuth } = useAuthStore()

  const parsed = useMemo(() => {
    try {
      const data = yaml.load(text) as ResumeData
      setParseError(null)
      return data
    } catch (e: any) {
      setParseError(e?.message || 'YAML 解析失败')
      return null
    }
  }, [text])

  async function loadFromRepo() {
    setLoading(true)
    const toastId = `resume-load-${Date.now()}`
    toast.loading('正在加载简历...', { id: toastId })
    try {
      let token: string | undefined
      try {
        token = await getAuthToken()
      } catch {
        // ignore: allow public read for public repo
      }
      let content = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, RESUME_PATH, GITHUB_CONFIG.BRANCH)
      if (!content) content = DEFAULT_YAML

      setText(content)
      setDirty(false)
      try {
        localStorage.removeItem(LOCAL_DRAFT_KEY)
      } catch {}
      toast.success('加载成功', { id: toastId })
    } catch (e: any) {
      // 不要让用户卡死，使用默认模板降级
      setText(DEFAULT_YAML)
      setDirty(false)
      toast.info('仓库加载失败，已使用内置模板', { id: toastId, description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  async function saveToRepo() {
    if (!text.trim()) {
      toast.error('内容为空，无法保存')
      return
    }

    setSaving(true)
    const toastId = `resume-save-${Date.now()}`
    toast.loading('正在保存到仓库...', { id: toastId })
    try {
      const token = await getAuthToken()
      await putFile(
        token,
        GITHUB_CONFIG.OWNER,
        GITHUB_CONFIG.REPO,
        RESUME_PATH,
        toBase64Utf8(text),
        `chore(resume): update resume (${new Date().toISOString()})`,
        GITHUB_CONFIG.BRANCH
      )
      setDirty(false)
      try {
        localStorage.removeItem(LOCAL_DRAFT_KEY)
      } catch {}
      toast.success('保存成功，等待部署完成', { id: toastId })
    } catch (e: any) {
      toast.error('保存失败', { id: toastId, description: e?.message })
    } finally {
      setSaving(false)
    }
  }

  async function onChoosePrivateKey(file: File) {
    try {
      const pem = await readFileAsText(file)
      await setPrivateKey(pem)
      toast.success('密钥导入成功')
    } catch {
      toast.error('密钥导入失败')
    }
  }

  useEffect(() => {
    // load draft first
    try {
      const draft = localStorage.getItem(LOCAL_DRAFT_KEY)
      if (draft) {
        setText(draft)
        setDirty(true)
        return
      }
    } catch {}
    // else load from repo
    loadFromRepo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!dirty) return
    try {
      localStorage.setItem(LOCAL_DRAFT_KEY, text)
    } catch {}
  }, [dirty, text])

  return (
    <div className="w-full max-w-6xl mx-auto my-10 md:my-12 font-sans">
      <Toaster
        richColors
        position="top-center"
        offset={120}
        toastOptions={{
          className: 'shadow-xl rounded-2xl border-2 border-primary/20 backdrop-blur-sm',
          style: { zIndex: '999999' },
          duration: 5000,
          closeButton: false,
        }}
      />

      <input
        ref={keyInputRef}
        type="file"
        accept=".pem"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) await onChoosePrivateKey(f)
          e.currentTarget.value = ''
        }}
      />

      <div className="rounded-3xl bg-base-100 shadow-2xl border border-base-content/10 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 md:px-8 py-5 border-b border-base-content/10 bg-base-100/60 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <div className="space-y-0.5">
              <div className="text-lg font-bold text-primary">简历编辑</div>
              <div className="text-sm text-base-content/60">独立编辑 `resume.yaml`，右侧实时预览</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
            <button className="btn btn-sm btn-outline rounded-full" onClick={() => keyInputRef.current?.click()} disabled={saving}>
              {isAuth ? '更换密钥' : '导入密钥'}
            </button>
            <button className="btn btn-sm btn-ghost rounded-full" onClick={loadFromRepo} disabled={loading || saving}>
              从仓库加载
            </button>
            <button className="btn btn-sm btn-primary rounded-full" onClick={saveToRepo} disabled={saving || loading || !!parseError}>
              保存到仓库
            </button>
            <a className="btn btn-sm btn-ghost rounded-full" href="/resume" target="_blank" rel="noreferrer">
              打开展示页
            </a>
            <a className="btn btn-sm btn-ghost rounded-full" href="/resume.tex" target="_blank" rel="noreferrer">
              LaTeX
            </a>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Editor */}
          <div className="p-4 md:p-6 border-b lg:border-b-0 lg:border-r border-base-content/10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-base-content/70">resume.yaml</div>
              <div className="text-xs text-base-content/50">
                {dirty ? '未保存' : '已同步'}{parseError ? ' · YAML 有错误' : ''}
              </div>
            </div>

            <textarea
              className="textarea textarea-bordered w-full font-mono text-sm leading-relaxed min-h-[60vh] rounded-2xl"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setDirty(true)
              }}
              placeholder="在这里编辑 YAML…"
              spellCheck={false}
            />

            {parseError && (
              <div className="mt-3 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                {parseError}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="p-0 lg:p-0 bg-[oklch(var(--b2))]">
            <div className="p-4 md:p-6 border-b border-base-content/10 bg-base-100/40 backdrop-blur">
              <div className="text-sm font-semibold text-base-content/70">预览</div>
            </div>
            <div className="p-0">
              {parsed ? (
                <ResumeViewer data={parsed} />
              ) : (
                <div className="p-8 text-base-content/60">等待 YAML 修复后再预览…</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

