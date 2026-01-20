/**
 * 简历数据结构定义
 */

export interface PersonalInfo {
  name: string
  title: string
  avatar: string
  email: string
  phone?: string
  location?: string
  website?: string
  social: SocialLink[]
  bio?: string
}

export interface SocialLink {
  platform: string
  url: string
  icon: string
}

export interface Education {
  degree: string
  field: string
  institution: string
  location: string
  startDate: string
  endDate: string
  gpa?: string
  description?: string
  honors?: string[]
}

export interface Experience {
  title: string
  company: string
  location: string
  startDate: string
  endDate: string | "present"
  description: string
  technologies?: string[]
  achievements?: string[]
}

export interface Project {
  name: string
  description: string
  url?: string
  github?: string
  technologies: string[]
  highlights: string[]
  image?: string
}

export interface SkillCategory {
  category: string
  items: string[]
  level?: "beginner" | "intermediate" | "advanced" | "expert"
}

export interface Publication {
  title: string
  authors: string[]
  venue: string
  year: number
  url?: string
  doi?: string
  type?: "conference" | "journal" | "workshop" | "preprint"
}

export interface ResumeData {
  personal: PersonalInfo
  education: Education[]
  experience: Experience[]
  projects: Project[]
  skills: SkillCategory[]
  publications?: Publication[]
  languages?: { name: string; level: string }[]
  certifications?: { name: string; issuer: string; date: string; url?: string }[]
  awards?: { name: string; issuer: string; date: string; description?: string }[]
}
