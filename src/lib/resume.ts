import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { ResumeData } from '@/interface/resume'

const RESUME_YAML_PATH = path.resolve('src/content/resume/resume.yaml')

export function loadResumeData(): ResumeData {
  const raw = fs.readFileSync(RESUME_YAML_PATH, 'utf8')
  const data = yaml.load(raw) as ResumeData
  return data
}

function escLatex(input: string): string {
  // minimal LaTeX escaping
  return String(input)
    .replaceAll('\\', '\\textbackslash{}')
    .replaceAll('{', '\\{')
    .replaceAll('}', '\\}')
    .replaceAll('#', '\\#')
    .replaceAll('%', '\\%')
    .replaceAll('&', '\\&')
    .replaceAll('_', '\\_')
    .replaceAll('^', '\\^{}')
    .replaceAll('~', '\\~{}')
}

export function renderResumeLatex(data: ResumeData): string {
  const p = data.personal

  const education = (data.education || [])
    .map((e) => {
      const line1 = `\\textbf{${escLatex(e.institution)}}\\hfill ${escLatex(e.location)}`
      const line2 = `${escLatex(e.degree)} in ${escLatex(e.field)}\\hfill ${escLatex(e.startDate)} -- ${escLatex(e.endDate)}`
      const extra = [e.gpa ? `GPA: ${escLatex(e.gpa)}` : '', e.description ? escLatex(e.description) : '']
        .filter(Boolean)
        .map(x => `\\\\{\\small ${x}}`)
        .join('')
      return `\\item ${line1}\\\\${line2}${extra}`
    })
    .join('\n')

  const experience = (data.experience || [])
    .map((x) => {
      const line1 = `\\textbf{${escLatex(x.company)}} --- ${escLatex(x.title)}\\hfill ${escLatex(x.startDate)} -- ${escLatex(x.endDate)}`
      const bullets = String(x.description || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.replace(/^-+\s*/, ''))
        .map(s => `\\item ${escLatex(s)}`)
        .join('\n')
      return `\\item ${line1}\n\\begin{itemize}\n${bullets}\n\\end{itemize}`
    })
    .join('\n')

  const projects = (data.projects || [])
    .map((x) => {
      const link = x.url || x.github || ''
      const head = link
        ? `\\textbf{${escLatex(x.name)}}\\hfill \\href{${escLatex(link)}}{${escLatex(link)}}`
        : `\\textbf{${escLatex(x.name)}}`
      const bullets = (x.highlights || []).map(h => `\\item ${escLatex(h)}`).join('\n')
      return `\\item ${head}\\\\{\\small ${escLatex(x.description)}}\n\\begin{itemize}\n${bullets}\n\\end{itemize}`
    })
    .join('\n')

  const skills = (data.skills || [])
    .map(s => `\\textbf{${escLatex(s.category)}}: ${escLatex((s.items || []).join(', '))}`)
    .join('\\\\\n')

  return String.raw`\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage[hidelinks]{hyperref}
\usepackage{enumitem}
\setlist[itemize]{leftmargin=1.25em, topsep=0.2em, itemsep=0.1em}
\pagenumbering{gobble}

\begin{document}

{\LARGE \textbf{${escLatex(p.name)}}}\\[2pt]
{\large ${escLatex(p.title)}}\\[6pt]
\href{mailto:${escLatex(p.email)}}{${escLatex(p.email)}}${p.website ? ` \quad | \quad \\href{${escLatex(p.website)}}{${escLatex(p.website)}}` : ''}\\[10pt]

${p.bio ? `{\\small ${escLatex(p.bio)}}\\[12pt]` : ''}

\section*{Education}
\begin{itemize}
${education}
\end{itemize}

\section*{Experience}
\begin{itemize}
${experience}
\end{itemize}

\section*{Projects}
\begin{itemize}
${projects}
\end{itemize}

\section*{Skills}
{\small
${skills}
}

\end{document}
`
}

