import { HOST } from './ajax'

// 单条访谈对话消息
export type InterviewMessage = {
  role: 'interviewer' | 'interviewee'
  content: string
}

// 流式调用访谈接口，逐块回调增量文本（SSE：data: <增量>\n\n，结束 data: [DONE]）
export async function postInterviewStream(
  questionId: string,
  history: InterviewMessage[],
  onDelta: (text: string) => void
): Promise<void> {
  const res = await fetch(`${HOST}/api/ai/interview/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, history }),
  })

  if (!res.ok || !res.body) {
    // 非流式错误（校验失败）：解析后端 JSON 错误信息
    const data = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(data?.message || '请求失败')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

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

      // 流式过程中的错误（如 Key 失效），以 error 事件返回
      if (eventLine?.trim() === 'event: error') {
        throw new Error(dataLine ? safeParse(dataLine.slice(5).trim()) : 'AI 请求失败')
      }
      if (!dataLine) continue

      const data = dataLine.slice(5).trim()
      if (data === '[DONE]') return
      const text = safeParse(data)
      if (text) onDelta(text)
    }
  }
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
