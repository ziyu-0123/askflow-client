// 后端地址：部署时用 NEXT_PUBLIC_API_BASE 配置，本地默认 localhost:3005
export const HOST = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3005'

type ResData = {
  errno: number
  msg?: string
  [key: string]: unknown
}

export async function get<T = ResData>(url: string): Promise<T> {
  const res = await fetch(`${HOST}${url}`)
  const data = await res.json()
  return data
}

export async function post<T = ResData>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${HOST}${url}`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  return data
}
