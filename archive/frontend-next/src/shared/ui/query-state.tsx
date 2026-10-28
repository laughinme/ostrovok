'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@/shared/api';

export function QueryState<T>({ query, children }: { query: UseQueryResult<T>; children(data: T): ReactNode }) {
  if (query.isPending) return <main className="page" role="status">Загружаем данные…</main>;
  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return <main className="page" role="alert">
      <h1>{missing ? 'Отель не найден' : 'Не удалось загрузить данные'}</h1>
      <p>{missing ? 'Возможно, ссылка устарела. Выберите другой отель.' : 'Проверьте соединение и попробуйте ещё раз.'}</p>
      {missing ? <Link className="btn btn-primary" href="/search">К подбору</Link> : <button className="btn btn-primary" onClick={() => void query.refetch()}>Повторить</button>}
    </main>;
  }
  return children(query.data);
}
