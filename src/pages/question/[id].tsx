import PageWrapper from '@/components/QuestionComponents/PageWrapper'
import type { GetServerSidePropsContext } from 'next'
import styles from '@/styles/Question.module.scss'
import { getQuestionById } from '@/services/question'

type ComponentInfo = {
  fe_id: string
  type: string
  title: string
  isHidden: boolean
  isLocked: boolean
  // 不同 type 的 props 形状不同，用索引签名兜底
  props: Record<string, unknown>
}

type PropsType = {
  errno: number
  data?: {
    id: string
    title: string
    desc?: string
    js?: string
    css?: string
    isPublished: boolean
    isDeleted: boolean
    componentList: ComponentInfo[]
  }
  msg?: string
}

// 临时引用
import QuestionInput from '@/components/QuestionComponents/QuestionInput'
import QuestionRadio from '@/components/QuestionComponents/QuestionRadio'

export default function Question(props: PropsType) {
  const { errno, data, msg = '' } = props

  // 数据错误
  if (errno !== 0) {
    return (
      <PageWrapper title="错误">
        <h1>错误</h1>
        <p>{msg}</p>
      </PageWrapper>
    )
  }

  const { id, title = '', desc = '', isDeleted, isPublished, componentList = [] } = data || {}

  // 已经被删除的，提示错误
  if (isDeleted) {
    return (
      <PageWrapper title={title} desc={desc}>
        <h1>{title}</h1>
        <p>该问卷已经被删除</p>
      </PageWrapper>
    )
  }

  // 尚未发布的，提示错误
  if (!isPublished) {
    return (
      <PageWrapper title={title} desc={desc}>
        <h1>{title}</h1>
        <p>该问卷尚未发布</p>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title={title} desc={desc}>
      <form method="post" action="/api/answer">
        <input type="hidden" name="questionId" value={id} />
        <div className={styles.componentWrapper}>
          <QuestionInput fe_id="c1" props={{ title: '你的姓名', placeholder: '请输入姓名' }} />
        </div>
        <div className={styles.componentWrapper}>
          <QuestionRadio
            fe_id="c2"
            props={{
              title: '你的性别',
              options: [
                { value: 'male', text: '男' },
                { value: 'female', text: '女' }
              ],
              value: 'male',
              isVertical: false
            }}
          />
        </div>
        <div className={styles.submitBtnContainer}>
          {/* <input type="submit" value="提交" /> */}
          <button type="submit">提交</button>
        </div>
      </form>
    </PageWrapper>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { id = '' } = context.params as { id?: string }

  // 根据 id await 获取问卷数据
  const data = await getQuestionById(id)

  return {
    props: { data }
  }
}
