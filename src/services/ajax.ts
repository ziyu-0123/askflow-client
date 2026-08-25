const HOST = 'http://localhost:3001' // Mock 的 host

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
    body: JSON.stringify(body)
  })
  const data = await res.json()
  return data
}
