import type { APIRoute } from 'astro'
import { loadResumeData, renderResumeLatex } from '@/lib/resume'

export const prerender = true

export const GET: APIRoute = async () => {
  const data = loadResumeData()
  const tex = renderResumeLatex(data)
  return new Response(tex, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // friendly download name
      'content-disposition': 'inline; filename="resume.tex"',
    },
  })
}

