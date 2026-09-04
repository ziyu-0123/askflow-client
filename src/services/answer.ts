import { post } from './ajax'

type AnswerItem = {
  componentId: string
  value: string
}

export type ConversationItem = {
  role: 'interviewer' | 'interviewee'
  content: string
}

type AnswerInfo = {
  questionId: string
  answerList?: AnswerItem[]
  conversationList?: ConversationItem[]
  usage?: { prompt: number; completion: number; total: number }
}

type ResData = {
  errno: number
  msg?: string
}

// 提交答卷（问卷答卷用 answerList，访谈答卷用 conversationList）
export async function postAnswer(answerInfo: AnswerInfo): Promise<ResData> {
  const url = '/api/answer'
  const data = await post<ResData>(url, answerInfo)
  return data
}
