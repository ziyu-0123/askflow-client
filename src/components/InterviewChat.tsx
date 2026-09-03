import { useState, useRef, useEffect, type FormEvent } from 'react'
import { postInterviewStream, type InterviewMessage } from '@/services/interview'
import styles from '@/styles/Interview.module.scss'

type Props = {
  questionId: string
}

export default function InterviewChat({ questionId }: Props) {
  const [messages, setMessages] = useState<InterviewMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingReply, setStreamingReply] = useState('')
  const [error, setError] = useState('')
  const startedRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function startRound(history: InterviewMessage[]) {
    setStreaming(true)
    setError('')
    setStreamingReply('')
    let reply = ''
    try {
      await postInterviewStream(questionId, history, (text) => {
        reply += text
        setStreamingReply(reply)
      })
      if (reply) {
        setMessages((prev) => [...prev, { role: 'interviewer', content: reply }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setStreaming(false)
      setStreamingReply('')
    }
  }

  // 开场自动触发第一轮（空 history，AI 输出开场白 + 第一个问题）
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    startRound([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 新消息时滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingReply])

  function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || streaming) return
    const userMessage: InterviewMessage = { role: 'interviewee', content: input.trim() }
    const next = [...messages, userMessage]
    setMessages(next)
    setInput('')
    startRound(next)
  }

  return (
    <div className={styles.chat}>
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'interviewer' ? styles.msgLeft : styles.msgRight}>
            <div className={styles.bubble}>{m.content}</div>
          </div>
        ))}
        {streamingReply && (
          <div className={styles.msgLeft}>
            <div className={styles.bubble}>
              {streamingReply}
              <span className={styles.cursor}>▍</span>
            </div>
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
        <div ref={bottomRef} />
      </div>
      <form className={styles.inputBar} onSubmit={handleSend}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的回答..."
          disabled={streaming}
        />
        <button type="submit" disabled={streaming || !input.trim()}>
          发送
        </button>
      </form>
    </div>
  )
}
