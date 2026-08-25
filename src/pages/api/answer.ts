import type { NextApiRequest, NextApiResponse } from 'next'

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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    // 不是 post 则返回错误
    res.status(200).json({ errno: -1, msg: 'Method 错误' })
  }

  const answerInfo = genAnswerInfo(req.body)

  try {
    // 提交到服务端 Mock

    // // 如果提交成功了
    // res.redirect('/success')

    // 如果提交失败了
    res.redirect('/fail')
  } catch (err) {
    
  }

  // res.status(200).json({ errno: 0 })
}
