import Head from 'next/head'

export default function Fail() {
  return (
    <>
      <Head>
        <title>提交失败</title>
        {/* <meta name="description" content="about page" /> */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <h1>失败</h1>
        <p>问卷提交失败</p>
      </main>
    </>
  )
}
