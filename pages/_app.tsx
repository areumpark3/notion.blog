// pages/_app.tsx
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Navbar } from '../components/nav';
import Footer from '../components/footer';

// 노션 스타일 임포트
import 'react-notion-x/src/styles.css';
// 코드 하이라이팅(선택사항)
import 'prismjs/themes/prism-tomorrow.css';
// 수학 공식(선택사항)
import 'katex/dist/katex.min.css';
// 글로벌 스타일
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute='class' defaultTheme='light'>
      <div className={`${GeistSans.variable} ${GeistMono.variable} antialiased max-w-xl mx-4 mt-8 sm:mx-auto text-black bg-white dark:text-white dark:bg-black`}>
        <main className="flex-auto min-w-0 mt-6 flex flex-col px-2 md:px-0">
          <Navbar />
          <Component {...pageProps} />
          <Footer />
        </main>
      </div>
    </ThemeProvider>
  );
}
