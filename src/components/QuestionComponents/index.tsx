import QuestionInput from './QuestionInput'
import QuestionRadio from './QuestionRadio'

type ComponentInfoType = {
  fe_id: string
  type: string
  isHidden: boolean
  // 不同 type 的 props 形状不同，用索引签名兜底
  props: Record<string, unknown>
}

export const getComponent = (comp: ComponentInfoType) => {
  const { fe_id, type, isHidden, props = {} } = comp

  if (isHidden) return null

  if (type === 'questionInput') {
    return <QuestionInput fe_id={fe_id} props={props as { title: string; placeholder?: string }} />
  }

  if (type === 'questionRadio') {
    return (
      <QuestionRadio
        fe_id={fe_id}
        props={
          props as {
            title: string
            options: Array<{ value: string; text: string }>
            value: string
            isVertical: boolean
          }
        }
      />
    )
  }

  return null
}
