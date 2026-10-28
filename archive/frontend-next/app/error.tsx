'use client';

export default function ErrorPage({ reset }: { reset(): void }) {
  return <main className="page" role="alert"><h1>Не удалось открыть страницу</h1><p>Попробуйте загрузить её ещё раз.</p><button className="btn btn-primary" onClick={reset}>Повторить</button></main>;
}
