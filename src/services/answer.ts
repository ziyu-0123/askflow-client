import { post } from './ajax'

type AnswerItem = {
  componentId: string
  value: string
}

type AnswerInfo = {
  questionId: string
  answerList: AnswerItem[]
}

type ResData = {
  errno: number
  msg?: string
}

// 提交答卷
export async function postAnswer(answerInfo: AnswerInfo): Promise<ResData> {
  const url = '/api/answer'
  const data = await post<ResData>(url, answerInfo)
  return data
}
