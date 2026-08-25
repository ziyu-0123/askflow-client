import Head from 'next/head'
import type { GetServerSidePropsContext } from 'next'

type PropsType = {
  id: string
}

export default function Question(props: PropsType) {
  return <>
    <Head>
      <title>Question</title>
      <meta name="description" content="question page" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
    <main>
      <h1>Question page</h1>
      <p>{props.id}</p>
    </main>
  </>
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { id = '' } = context.params as { id?: string }

  // 根据 id await 获取问卷数据

  return {
    props: {
      id,
    }
  }
}