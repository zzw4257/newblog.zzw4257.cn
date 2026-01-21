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
  if (!input) return ''
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
    .replaceAll('$', '\\$')
}

function cleanMarkdown(text: string): string {
  // Remove markdown bold **text** -> text
  return text.replace(/\*\*(.*?)\*\*/g, '$1')
}

export function generateLatex(data: ResumeData): string {
  const p = data.personal

  // Sidebar content
  const researchInterests = (data.researchInterests || [])
    .map(ri => `        \\item ${escLatex(ri)}`)
    .join('\n')

  const skillsLatex = (data.skills || []).map(skill => {
    const items = (skill.items || []).map(item => escLatex(item)).join(', ')
    return `    \\textbf{${escLatex(skill.category)}:}\n    \\begin{itemize}[leftmargin=*, label={}, noitemsep]\n        \\item ${items}\n    \\end{itemize}`
  }).join('\n\n    ')

  const languagesLatex = (data.languages || []).map(lang => {
    if (lang.note) {
      return `\\skill{\\faLanguage}{${escLatex(lang.name)} (${escLatex(lang.note)})}`
    }
    return `\\pointskill{\\faLanguage}{${escLatex(lang.name)} (${escLatex(lang.level)})}{5}`
  }).join('\n    ')

  const algorithmicSkillLatex = (data.algorithmicSkill || []).map(skill => {
    let line = `\\skill{\\faCode}{${escLatex(skill.platform)}`
    if (skill.rating) line += `: ${escLatex(skill.rating)}`
    if (skill.achievement) line += ` (${escLatex(skill.achievement)})`
    line += '}'
    return line
  }).join('\n    ')

  // Main content
  const educationLatex = (data.education || [])
    .map(e => {
      const details = []
      if (e.gpa) details.push(`\\textbf{GPA:} ${escLatex(e.gpa)}`)
      if (e.avgScore) details.push(`\\textbf{Avg Score:} ${escLatex(e.avgScore)}`)
      if (e.eliteProgram) details.push(`\\textbf{Elite Program:} ${escLatex(e.eliteProgram)}`)
      if (e.keyCourses && e.keyCourses.length > 0) {
        const courses = e.keyCourses.map(c => `${escLatex(c.name)} (${c.score})`).join(', ')
        details.push(`\\textbf{Key Courses:} ${courses}`)
      }
      const detailsStr = details.length > 0
        ? `\n    \\begin{itemize}[leftmargin=1.5em, noitemsep, topsep=2pt]\n        \\item ${details.join(' \\quad ')}\n    \\end{itemize}`
        : ''
      return `\\cvitem{${escLatex(e.startDate)} -- ${e.endDate === 'Present' ? 'Present' : escLatex(e.endDate)}}
    {\\textbf{${escLatex(e.institution)}}}
    {${escLatex(e.location)}}
    {${escLatex(e.degree)} in ${escLatex(e.field)}, \\textbf{${escLatex(e.program || '')}}${detailsStr}}
    }`
    })
    .join('\n\n    ')

  const researchExperienceLatex = (data.researchExperience || [])
    .map(r => {
      const highlights = (r.highlights || [])
        .map(h => `\\item ${escLatex(cleanMarkdown(h))}`)
        .join('\n        ')
      const highlightsStr = highlights
        ? `\n    \\begin{itemize}[leftmargin=1.5em, noitemsep, topsep=2pt]\n        ${highlights}\n    \\end{itemize}`
        : ''
      return `\\cvitem{${escLatex(r.startDate)} -- ${r.endDate === 'Present' ? 'Present' : escLatex(r.endDate)}}
    {\\textbf{${escLatex(r.title)}}${r.subtitle ? `: ${escLatex(r.subtitle)}` : ''}}
    {${r.affiliation ? escLatex(r.affiliation) : ''}}
    {${r.role ? `${escLatex(r.role)}. ` : ''}${escLatex(cleanMarkdown(r.description))}${highlightsStr}}
    }`
    })
    .join('\n\n    ')

  const projectsLatex = (data.projects || [])
    .map(x => {
      const highlights = (x.highlights || [])
        .map(h => `\\item ${escLatex(cleanMarkdown(h))}`)
        .join('\n        ')
      const highlightsStr = highlights
        ? `\n    \\begin{itemize}[leftmargin=1.5em, noitemsep, topsep=2pt]\n        ${highlights}\n    \\end{itemize}`
        : ''
      const contextStr = x.context ? `\\textbf{${escLatex(x.context)}} ` : ''
      return `\\cvitem{${x.context ? escLatex(x.context) : ''}}
    {\\textbf{${escLatex(x.name)}}}
    {${escLatex((x.technologies || []).join(' / '))}}
    {${contextStr}${escLatex(cleanMarkdown(x.description))}${highlightsStr}}
    }`
    })
    .join('\n\n    ')

  const awardsLatex = (data.awards || [])
    .map(a => {
      const noteStr = a.note ? ` \\textit{- ${escLatex(a.note)}}` : ''
      return `\\cvitemshort{${escLatex(a.date)}}{${escLatex(a.name)}${noteStr}}`
    })
    .join('\n    ')

  const leadershipLatex = (data.leadership || [])
    .map(l => {
      const awards = (l.awards || [])
        .map(a => escLatex(a))
        .join(', ')
      const awardsStr = awards ? ` Awarded \\textbf{${awards}}.` : ''
      const timeStr = l.startDate
        ? `${escLatex(l.startDate)}${l.endDate && l.endDate !== 'present' ? ` -- ${escLatex(l.endDate)}` : ''}`
        : ''
      return `\\cvitem{${timeStr}}
    {\\textbf{${escLatex(l.title)}}}
    {${escLatex(l.location)}}
    {${escLatex(cleanMarkdown(l.description))}${awardsStr}}
    }`
    })
    .join('\n\n    ')

  const referencesLatex = (data.references || [])
    .map(ref => {
      return `\\textbf{${escLatex(ref.name)}} \\\\
    \\textit{${escLatex(ref.title)}} \\\\
    ${escLatex(ref.affiliation)} \\\\
    \\texttt{${escLatex(ref.email)}}`
    })
    .join('\n    \n    \\vspace{0.5em}\n    \n    ')

  return String.raw`%-------------------------------------------------------------------------------
%                             PREAMBLE & PACKAGES
%-------------------------------------------------------------------------------
\documentclass[
	a4paper,
	sidecolor=gray!10,      
	sectioncolor=MidnightBlue, 
	subsectioncolor=NavyBlue,
	itemtextcolor=black!90,
	sidebarwidth=0.34\paperwidth, 
	topbottommargin=0.02\paperheight,
	leftrightmargin=20pt,
	profilepicsize=3.5cm,
	profilepicstyle=profilecircle,
]{sixtysecondscv}

% Additional packages
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{enumitem}
\usepackage{fontawesome5} 
\usepackage{mathptmx}     

% Color definitions
\definecolor{MidnightBlue}{RGB}{0, 63, 136}
\definecolor{NavyBlue}{RGB}{0, 85, 165}

%-------------------------------------------------------------------------------
%                         SIDEBAR INFORMATION
%-------------------------------------------------------------------------------

% Profile
\cvname{${escLatex(p.name)}}
\cvjobtitle{${escLatex(p.title.replace(/\n/g, ' \\\\[0.2em] '))}}

% Contact Info
\cvprofilepic{photo} % 确保目录下有一张 photo.jpg 或 photo.png
\cvaddress{${escLatex(p.location || '')}}
\cvphone{${escLatex(p.phone || '')}}
\cvsite{${escLatex((p.website || '').replace(/^https?:\/\//, ''))}}
\cvmail{${escLatex(p.email)}}
\cvcustomdata{\faGithub}{${escLatex((p.social?.[0]?.url || '').replace(/^https?:\/\//, ''))}}

% Sidebar Content
\addtofrontsidebar{
    % Research Interests
	\profilesection{Research Interests}
    \begin{itemize}[leftmargin=*, label={\textbullet}, noitemsep]
${researchInterests}
    \end{itemize}

    % Technical Skills
	\profilesection{Technical Skills}
${skillsLatex}

    % Languages
	\profilesection{Languages}
    ${languagesLatex}
    
    % Algorithmic Skill
    \profilesection{Algorithmic Skill}
    ${algorithmicSkillLatex}

    
}

%-------------------------------------------------------------------------------
%                         MAIN BODY
%-------------------------------------------------------------------------------
\begin{document}

\addtobacksidebar{
    % References
    \profilesection{References}
    ${referencesLatex}
}

\makefrontsidebar

%--- EDUCATION ---
\cvsection{Education}
\begin{cvtable}[1.2]
	${educationLatex}
\end{cvtable}

%--- RESEARCH EXPERIENCE ---
\cvsection{Research Experience}
\begin{cvtable}[1.2]
    ${researchExperienceLatex}
\end{cvtable}

%--- SELECTED PROJECTS ---
\cvsection{Selected Projects}
\begin{cvtable}[1.2]
    ${projectsLatex}
\end{cvtable}

\clearpage % 强制换页（如果右侧内容自然换页则不需要这行，但在该模板中推荐手动控制）

\makecontinuedsidebar % <--- 调用这个命令在第二页生成背景条和剩余内容

%--- AWARDS & HONORS ---
\cvsection{Honors \& Awards}
\begin{cvtable}[1]
	${awardsLatex}
\end{cvtable}

%--- LEADERSHIP ---
\cvsection{Leadership}
\begin{cvtable}[1.1]
    ${leadershipLatex}
\end{cvtable}

\end{document}
`
}

// Legacy function name for backward compatibility
export function renderResumeLatex(data: ResumeData): string {
  return generateLatex(data)
}
