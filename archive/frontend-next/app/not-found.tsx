import Link from 'next/link';

export default function NotFound() {
  return <main className="page"><h1>Страница не найдена</h1><p>Проверьте адрес или вернитесь к подбору отеля.</p><Link className="btn btn-primary" href="/">На главную</Link></main>;
}
