// The part of https://core.telegram.org/bots/webapps#initializing-mini-apps the app uses.
interface TelegramWebApp {
  initData: string;
  colorScheme: 'light' | 'dark';
  ready(): void;
  expand(): void;
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp };
}
