import { useState, useRef, useEffect, type FormEvent } from 'react'
import { postInterviewStream, type InterviewMessage, type InterviewUsage } from '@/services/interview'
import { postAnswer } from '@/services/answer'
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
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [canFinish, setCanFinish] = useState(false)
  const [retryable, setRetryable] = useState(false)
  const startedRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // 累积本次访谈的总 token 用量，提交答卷时随 conversationList 持久化
  const usageRef = useRef<InterviewUsage>({ prompt: 0, completion: 0, total: 0 })

  async function startRound(history: InterviewMessage[]) {
    setStreaming(true)
    setError('')
    setRetryable(false)
    setStreamingReply('')
    let reply = ''
    // 每轮创建独立的中止控制器，组件卸载时中断进行中的流
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const { finished: roundFinished, usage } = await postInterviewStream(
        questionId,
        history,
        (text) => {
          reply += text
          setStreamingReply(reply)
        },
        controller.signal
      )
      // 累积该轮 token 用量
      if (usage) {
        usageRef.current = {
          prompt: usageRef.current.prompt + usage.prompt,
          completion: usageRef.current.completion + usage.completion,
          total: usageRef.current.total + usage.total,
        }
      }
      if (reply) {
        setMessages((prev) => [...prev, { role: 'interviewer', content: reply }])
      }
      // AI 提纲问完并收尾后，才允许填写人结束访谈
      if (roundFinished) {
        setCanFinish(true)
      }
    } catch (err) {
      // 用户离开页面触发的中止，无需提示
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : '请求失败')
      // 网络错误（TypeError）可重试；业务错误（普通 Error）不可重试
      setRetryable(err instanceof TypeError)
    } finally {
      abortRef.current = null
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

  // 组件卸载时中止进行中的流式请求
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
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

  // 网络中断后重试当前轮：基于当前 messages（含本轮用户消息）重新发起
  function handleRetry() {
    if (streaming || messages.length === 0) return
    startRound(messages)
  }

  async function handleFinish() {
    if (finished || submitting || messages.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const res = await postAnswer({
        questionId,
        conversationList: messages,
        usage: usageRef.current,
      })
      if (res.errno === 0) {
        setFinished(true)
      } else {
        setError(res.msg || '提交失败')
      }
    } catch {
      setError('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
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
        {error && (
          <div className={styles.error}>
            {error}
            {retryable && !streaming && (
              <button
                onClick={handleRetry}
                style={{ marginLeft: 8, cursor: 'pointer' }}
              >
                重试
              </button>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {finished ? (
        <div className={styles.finished}>感谢参与，本次访谈已结束</div>
      ) : (
        <>
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
          <div className={styles.actions}>
            <button
              className={styles.finishBtn}
              onClick={handleFinish}
              disabled={submitting || messages.length === 0 || !canFinish}
            >
              {submitting ? '提交中...' : '结束访谈'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
