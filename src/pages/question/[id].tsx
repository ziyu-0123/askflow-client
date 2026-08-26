import PageWrapper from '@/components/QuestionComponents/PageWrapper'
import type { GetServerSidePropsContext } from 'next'
import styles from '@/styles/Question.module.scss'

type PropsType = {
  id: string
}

// 临时引用
import QuestionInput from '@/components/QuestionComponents/QuestionInput'
import QuestionRadio from '@/components/QuestionComponents/QuestionRadio'

export default function Question(props: PropsType) {
  return (
    <PageWrapper title="question">
      <form method="post" action="/api/answer">
        <input type="hidden" name="questionId" value={props.id} />
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

  return {
    props: {
      id
    }
  }
}
