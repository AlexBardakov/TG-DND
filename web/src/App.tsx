import { useEffect, useState } from 'react';
import { fetchMe, type Me, NotInTelegramError } from './api';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; me: Me }
  | { kind: 'outside-telegram' }
  | { kind: 'error' };

export function App() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    fetchMe()
      .then((me) => setState({ kind: 'ready', me }))
      .catch((error: unknown) =>
        setState({ kind: error instanceof NotInTelegramError ? 'outside-telegram' : 'error' }),
      );
  }, []);

  switch (state.kind) {
    case 'loading':
      return <main className="screen">Загрузка…</main>;
    case 'outside-telegram':
      return <main className="screen">Откройте приложение через бота клуба в Telegram.</main>;
    case 'error':
      return <main className="screen">Не удалось загрузить данные. Попробуйте открыть приложение ещё раз.</main>;
    case 'ready':
      return (
        <main className="screen">
          <h1>Привет, {state.me.firstName}!</h1>
          <p>Скоро здесь появится каталог игр клуба.</p>
          {state.me.isAdmin && <p className="hint">Вы администратор клуба.</p>}
        </main>
      );
  }
}
