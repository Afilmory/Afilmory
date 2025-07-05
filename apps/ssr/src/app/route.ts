import type { NextRequest } from 'next/server'

export const GET = async (req: NextRequest) => {
  if (process.env.NODE_ENV === 'development') {
    return import('./[...all]/dev').then((m) => m.handler(req))
  }

  // 在生产模式下动态导入 index.html
  const { default: indexHtml } = await import('../index.html')
  return new Response(indexHtml, {
    headers: {
      'Content-Type': 'text/html',
      'X-SSR': '1',
    },
  })
}
