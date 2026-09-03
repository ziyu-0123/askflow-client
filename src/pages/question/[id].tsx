import PageWrapper from '@/components/QuestionComponents/PageWrapper'
import type { GetServerSidePropsContext } from 'next'
import styles from '@/styles/Question.module.scss'
import { getQuestionById } from '@/services/question'
import { getComponent } from '@/components/QuestionComponents'
import InterviewChat from '@/components/InterviewChat'

type ComponentInfo = {
  fe_id: string
  type: string
  title: string
  isHidden: boolean
  isLocked: boolean
  // 不同 type 的 props 形状不同，用索引签名兜底
  props: Record<string, unknown>
}

// 单个组件的文案译文（与 B 端 AITranslateModal 保存的 texts 结构一致）
type ComponentTextTranslation = {
  title?: string
  desc?: string
  text?: string
  placeholder?: string
  options?: string[]
  list?: string[]
}

type QuestionTranslation = {
  title: string
  desc: string
  texts: { [fe_id: string]: ComponentTextTranslation }
}

type QuestionData = {
  _id: string
  title: string
  desc?: string
  js?: string
  css?: string
  isPublished: boolean
  isDeleted: boolean
  type?: 'survey' | 'interview'
  componentList?: ComponentInfo[]
  translations?: { [lang: string]: QuestionTranslation }
}

type PropsType = {
  errno: number
  data?: QuestionData
  msg?: string
  // 当前生效语言（null = 主版本）；?lang 非法或无译文时回退主版本
  activeLang?: string | null
  // 已翻译语言码列表（语言链接行仅在其非空时显示）
  availableLangs?: string[]
}

// 语言码 → 链接行显示名（各语言自称）
const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  es: 'Español',
  ru: 'Русский',
}

// 按 type 用译文覆盖文案字段（与 B 端 texts 构建互逆）：
// title/desc/text/placeholder 直接覆盖；options/list 按主版本结构只换 text
// （value 保持主版本原值不重写——value 是统计聚合 key）。
// 译文选项数组长度与主版本不一致 → 整组件回退（防 AI 增删选项导致 value 错位）
function translateComponent(comp: ComponentInfo, t: ComponentTextTranslation): ComponentInfo {
  const props: Record<string, unknown> = { ...comp.props }

  switch (comp.type) {
    case 'questionInfo':
      if (t.title !== undefined) props.title = t.title
      if (t.desc !== undefined) props.desc = t.desc
      break
    case 'questionTitle':
    case 'questionParagraph':
      if (t.text !== undefined) props.text = t.text
      break
    case 'questionInput':
    case 'questionTextarea':
      if (t.title !== undefined) props.title = t.title
      if (t.placeholder !== undefined) props.placeholder = t.placeholder
      break
    case 'questionRadio': {
      const options = comp.props.options
      const texts = t.options
      if (
        !Array.isArray(options) ||
        !Array.isArray(texts) ||
        options.length !== texts.length ||
        t.title === undefined
      ) {
        return comp // 长度不一致：整组件回退主版本
      }
      props.title = t.title
      props.options = options.map((o, i) => ({
        ...(o as Record<string, unknown>),
        text: texts[i],
      }))
      break
    }
    case 'questionCheckbox': {
      const list = comp.props.list
      const texts = t.list
      if (
        !Array.isArray(list) ||
        !Array.isArray(texts) ||
        list.length !== texts.length ||
        t.title === undefined
      ) {
        return comp // 长度不一致：整组件回退主版本
      }
      props.title = t.title
      props.list = list.map((o, i) => ({
        ...(o as Record<string, unknown>),
        text: texts[i],
      }))
      break
    }
    default:
      return comp
  }

  return { ...comp, props }
}

// 服务端应用译文：命中 translations[lang] 时替换问卷级 title/desc + 组件文案；
// 未带 lang / 无该语言译文 → 原样返回（渲染主版本，行为与现状一致）
function applyTranslation(
  question: QuestionData,
  lang?: string
): { title: string; desc: string; componentList: ComponentInfo[]; activeLang: string | null } {
  const mainList = question.componentList ?? []
  const translation =
    lang && question.translations ? question.translations[lang] : undefined
  if (!translation) {
    return {
      title: question.title,
      desc: question.desc ?? '',
      componentList: mainList,
      activeLang: null,
    }
  }

  const texts = translation.texts ?? {}
  const componentList = mainList.map((c) => {
    const t = texts[c.fe_id]
    // fe_id 未命中 → 整组件回退主版本（主版本新增组件场景，中英混排可接受）
    return t ? translateComponent(c, t) : c
  })

  return {
    title: translation.title,
    desc: translation.desc,
    componentList,
    activeLang: lang ?? null,
  }
}

export default function Question(props: PropsType) {
  const { errno, data, msg = '', activeLang = null, availableLangs = [] } = props

  // 数据错误
  if (errno !== 0) {
    return (
      <PageWrapper title="错误">
        <h1>错误</h1>
        <p>{msg}</p>
      </PageWrapper>
    )
  }

  const { _id: id, isDeleted, isPublished } = data || {}
  const { title = '', desc = '', componentList = [] } = data ? applyTranslation(data, activeLang ?? undefined) : {}

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

  // 访谈问卷走聊天式 UI
  if (data?.type === 'interview') {
    return (
      <PageWrapper title={title} desc={desc}>
        <InterviewChat questionId={id!} />
      </PageWrapper>
    )
  }

  // 遍历组件
  const ComponentListElem = (
    <>
      {componentList.map((c) => {
        const ComponentElem = getComponent(c)
        return (
          <div key={c.fe_id} className={styles.componentWrapper}>
            {ComponentElem}
          </div>
        )
      })}
    </>
  )

  // 语言链接行：主版本 + 各已翻译语言，当前语言高亮，其余为纯文本链接（无 JS，纯 SSR）
  // 仅在存在译文时显示
  const LangRowElem =
    availableLangs.length > 0 ? (
      <div className={styles.langRow}>
        {activeLang === null ? (
          <span className={styles.langActive}>中文</span>
        ) : (
          <a href={`/question/${id}`}>中文</a>
        )}
        {availableLangs.map((l) =>
          l === activeLang ? (
            <span key={l} className={styles.langActive}>
              {LANG_NAMES[l] ?? l}
            </span>
          ) : (
            <a key={l} href={`/question/${id}?lang=${l}`}>
              {LANG_NAMES[l] ?? l}
            </a>
          )
        )}
      </div>
    ) : null

  return (
    <PageWrapper title={title} desc={desc}>
      {LangRowElem}
      <form method="post" action="/api/answer">
        <input type="hidden" name="questionId" value={id} />
        {ComponentListElem}

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

  // query 值可能为 string 或 string[]（如 ?lang=en&lang=ja），统一取第一个
  const rawLang = context.query.lang
  const lang = Array.isArray(rawLang) ? rawLang[0] : rawLang

  // 根据 id await 获取问卷数据
  const data = await getQuestionById(id)

  // 已翻译语言列表（供语言链接行渲染）；?lang 无对应译文时 activeLang 回退主版本
  const questionData = data?.data as QuestionData | undefined
  const availableLangs = questionData?.translations
    ? Object.keys(questionData.translations)
    : []
  const activeLang =
    lang && availableLangs.includes(lang) ? lang : null

  // 把 API 响应展开，让 props 直接拿到 errno / data / msg
  return {
    props: { ...data, activeLang, availableLangs }
  }
}
