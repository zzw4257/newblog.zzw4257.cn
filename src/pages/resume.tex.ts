import type { APIRoute } from 'astro'

export const prerender = true

export const GET: APIRoute = async () => {
  const message = `% 简历正在施工中，敬请期待...
% Resume is under construction, please stay tuned...`
  return new Response(message, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'content-disposition': 'inline; filename="resume.tex"',
    },
  })
}
