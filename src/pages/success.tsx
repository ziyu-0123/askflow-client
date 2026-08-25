import Head from 'next/head'

export default function Success() {
  return (
    <>
      <Head>
        <title>提交成功</title>
        {/* <meta name="description" content="about page" /> */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <h1>成功</h1>
        <p>问卷提交成功</p>
      </main>
    </>
  )
}