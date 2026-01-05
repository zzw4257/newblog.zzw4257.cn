import { getAuthToken, hasAuth } from './auth'
import { readTextFileFromRepo } from './github-client'
import { GITHUB_CONFIG } from '@/consts'
import { parseFrontmatter } from './frontmatter'
import type { PublishForm } from '@/components/write/types'
import dayjs from 'dayjs'

export async function loadBlog(slug: string): Promise<{ form: PublishForm, cover?: string }> {
    let token: string | undefined
    if (await hasAuth()) {
        try {
            token = await getAuthToken()
        } catch (e) {
            console.warn('Failed to get auth token, trying public access', e)
        }
    }
    
    let path = `src/content/blog/${slug}.md`
    let content = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
    
    if (!content) {
         path = `src/content/blog/${slug}.mdx`
         content = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
    }

    if (!content) {
        throw new Error('Blog not found')
    }

    const { data, content: md } = parseFrontmatter(content)

    const form: PublishForm = {
        slug,
        title: data.title || '',
        md: md || '',
        tags: data.tags || [],
        date: data.pubDate ? dayjs(data.pubDate).format('YYYY-MM-DDTHH:mm') : '',
        summary: data.description || '',
        hidden: data.draft || false,
        categories: data.categories || []
    }

    return { form, cover: data.image }
}
