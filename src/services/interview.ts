import { HOST } from './ajax'

// 单条访谈对话消息
export type InterviewMessage = {
  role: 'interviewer' | 'interviewee'
  content: string
}

// 单轮 token 用量（camelCase，与后端 event: usage 一致）
export type InterviewUsage = {
  prompt: number
  completion: number
  total: number
}

// 流式调用访谈接口，逐块回调增量文本（SSE：data: <增量>\n\n，结束 data: [DONE]）
// 返回 { finished（是否收到访谈结束信号）, usage（该轮 token 用量） }
export async function postInterviewStream(
  questionId: string,
  history: InterviewMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<{ finished: boolean; usage?: InterviewUsage }> {
  const res = await fetchWithRetry(
    `${HOST}/api/ai/interview/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, history }),
      signal,
    },
    2
  )

  if (!res.ok || !res.body) {
    // 非流式错误（校验失败）：解析后端 JSON 错误信息
    const data = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(data?.message || '请求失败')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finished = false
  let usage: InterviewUsage | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // 按 SSE 事件分隔符 \n\n 切分，逐个处理
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)

      const lines = rawEvent.trim().split('\n')
      const eventLine = lines.find((l) => l.startsWith('event:'))
      const dataLine = lines.find((l) => l.startsWith('data:'))

      // 访谈结束信号（提纲问完收尾）
      if (eventLine?.trim() === 'event: finished') {
        finished = true
        continue
      }
      // 单轮 token 用量（后端流结束时返回，用于前端累积）
      if (eventLine?.trim() === 'event: usage') {
        usage = dataLine ? parseUsage(dataLine.slice(5).trim()) : undefined
        continue
      }
      // 流式过程中的错误（如 Key 失效），以 error 事件返回
      if (eventLine?.trim() === 'event: error') {
        throw new Error(dataLine ? safeParse(dataLine.slice(5).trim()) : 'AI 请求失败')
      }
      if (!dataLine) continue

      const data = dataLine.slice(5).trim()
      if (data === '[DONE]') return { finished, usage }
      const text = safeParse(data)
      if (text) onDelta(text)
    }
  }

  return { finished, usage }
}

// 解析 SSE data 的 JSON 字符串，失败返回空串
function safeParse(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'string' ? parsed : ''
  } catch {
    return ''
  }
}

// 解析 usage 事件的 JSON 对象，失败返回 undefined
function parseUsage(raw: string): InterviewUsage | undefined {
  try {
    const parsed = JSON.parse(raw)
    if (
      typeof parsed.prompt === 'number' &&
      typeof parsed.completion === 'number' &&
      typeof parsed.total === 'number'
    ) {
      return { prompt: parsed.prompt, completion: parsed.completion, total: parsed.total }
    }
    return undefined
  } catch {
    return undefined
  }
}

// 带网络错误重试的 fetch：仅对网络层错误（断网/连接失败）重试，AbortError 不重试
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries: number
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init)
    } catch (err) {
      // 用户主动中断（组件卸载）不重试
      if (err instanceof Error && err.name === 'AbortError') throw err
      // 最后一次尝试仍失败则抛出
      if (attempt === retries) throw err
      // 指数退避 1s / 2s / 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt))
    }
  }
  throw new Error('请求失败')
}
