import type { NextApiRequest, NextApiResponse } from 'next'
import { postAnswer } from '@/services/answer'

type AnswerItem = {
  componentId: string
  value: string
}

type AnswerInfo = {
  questionId: string
  answerList: AnswerItem[]
}

type ReqBody = Record<string, string>

function genAnswerInfo(reqBody: ReqBody): AnswerInfo {
  const answerList: AnswerItem[] = []

  Object.keys(reqBody).forEach((key) => {
    if (key === 'questionId') return
    answerList.push({
      componentId: key,
      value: reqBody[key]
    })
  })

  return {
    questionId: reqBody.questionId || '',
    answerList
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    // 不是 post 则返回错误
    res.status(200).json({ errno: -1, msg: 'Method 错误' })
    return
  }

  // 获取并格式化表单数据
  const answerInfo = genAnswerInfo(req.body)
  console.log('answerInfo', answerInfo)

  try {
    // 提交到服务端 Mock
    const resData = await postAnswer(answerInfo)
    console.log('resData...', resData)

    if (resData.errno === 0) {
      // 如果提交成功了
      res.redirect('/success')
    } else {
      // 提交失败了
      res.redirect('/fail')
    }
  } catch {
    res.redirect('/fail')
  }

  // res.status(200).json({ errno: 0 })
}
