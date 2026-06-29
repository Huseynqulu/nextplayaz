import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "az" | "en" | "ru";

type Dict = Record<string, string>;

const az: Dict = {
  "nav.home": "Ana səhifə",
  "nav.marketplace": "Marketplace",
  "nav.seller": "Satıcı ol",
  "nav.support": "Dəstək",
  "nav.search": "Oyun, hesab, açar axtar...",
  "auth.login": "Giriş",
  "auth.register": "Qeydiyyat",
  "auth.signedIn": "Daxil olunub",
  "menu.profile": "Profil",
  "menu.orders": "Sifarişlərim",
  "menu.becomeSeller": "Satıcı ol",
  "menu.myProducts": "Məhsullarım",
  "menu.admin": "Admin Panel",
  "menu.signOut": "Çıxış",
  "hero.badge": "Azərbaycanın #1 Gaming Marketplace-i",
  "hero.title1": "Gaming aləminin",
  "hero.title2": "yeni mərkəzi",
  "hero.sub": "Oyunlar, hesablar, açarlar və premium gaming xidmətləri. Escrow sistemi ilə qorunan ödənişlər. Yoxlanılmış satıcılar. Anında çatdırılma.",
  "hero.cta1": "Marketplace-ə keç",
  "hero.cta2": "Satıcı ol",
  "hero.stat1": "Tamamlanmış sifariş",
  "hero.stat2": "Escrow qorunma",
  "hero.stat3": "Online dəstək",
  "footer.tagline": "Azərbaycanın ilk premium gaming marketplace platforması. Təhlükəsiz escrow ödənişlər, yoxlanılmış satıcılar, anında çatdırılma.",
  "footer.marketplace": "Marketplace",
  "footer.all": "Bütün məhsullar",
  "footer.games": "Oyunlar",
  "footer.accounts": "Hesablar",
  "footer.keys": "Açarlar",
  "footer.services": "Xidmətlər",
  "footer.account": "Hesab",
  "footer.why": "Niyə NextPlay?",
  "footer.escrow": "Escrow qorunma",
  "footer.instant": "Anında çatdırılma",
  "footer.support24": "24/7 dəstək",
  "footer.rights": "Bütün hüquqlar qorunur.",
  "footer.terms": "Şərtlər",
  "footer.privacy": "Məxfilik",
  "footer.refund": "Geri qaytarma",
};

const en: Dict = {
  "nav.home": "Home",
  "nav.marketplace": "Marketplace",
  "nav.seller": "Become a seller",
  "nav.support": "Support",
  "nav.search": "Search games, accounts, keys...",
  "auth.login": "Sign in",
  "auth.register": "Sign up",
  "auth.signedIn": "Signed in",
  "menu.profile": "Profile",
  "menu.orders": "My orders",
  "menu.becomeSeller": "Become a seller",
  "menu.myProducts": "My products",
  "menu.admin": "Admin panel",
  "menu.signOut": "Sign out",
  "hero.badge": "Azerbaijan's #1 Gaming Marketplace",
  "hero.title1": "The new home of",
  "hero.title2": "gaming",
  "hero.sub": "Games, accounts, keys and premium gaming services. Escrow-protected payments. Verified sellers. Instant delivery.",
  "hero.cta1": "Go to Marketplace",
  "hero.cta2": "Become a seller",
  "hero.stat1": "Completed orders",
  "hero.stat2": "Escrow protection",
  "hero.stat3": "Online support",
  "footer.tagline": "Azerbaijan's first premium gaming marketplace. Secure escrow payments, verified sellers, instant delivery.",
  "footer.marketplace": "Marketplace",
  "footer.all": "All products",
  "footer.games": "Games",
  "footer.accounts": "Accounts",
  "footer.keys": "Keys",
  "footer.services": "Services",
  "footer.account": "Account",
  "footer.why": "Why NextPlay?",
  "footer.escrow": "Escrow protection",
  "footer.instant": "Instant delivery",
  "footer.support24": "24/7 support",
  "footer.rights": "All rights reserved.",
  "footer.terms": "Terms",
  "footer.privacy": "Privacy",
  "footer.refund": "Refunds",
};

const ru: Dict = {
  "nav.home": "Главная",
  "nav.marketplace": "Маркетплейс",
  "nav.seller": "Стать продавцом",
  "nav.support": "Поддержка",
  "nav.search": "Игры, аккаунты, ключи...",
  "auth.login": "Войти",
  "auth.register": "Регистрация",
  "auth.signedIn": "Вы вошли как",
  "menu.profile": "Профиль",
  "menu.orders": "Мои заказы",
  "menu.becomeSeller": "Стать продавцом",
  "menu.myProducts": "Мои товары",
  "menu.admin": "Админ-панель",
  "menu.signOut": "Выйти",
  "hero.badge": "Игровой маркетплейс №1 в Азербайджане",
  "hero.title1": "Новый центр",
  "hero.title2": "игрового мира",
  "hero.sub": "Игры, аккаунты, ключи и премиальные игровые услуги. Платежи под защитой эскроу. Проверенные продавцы. Мгновенная доставка.",
  "hero.cta1": "Перейти в маркетплейс",
  "hero.cta2": "Стать продавцом",
  "hero.stat1": "Завершённых заказов",
  "hero.stat2": "Защита эскроу",
  "hero.stat3": "Поддержка онлайн",
  "footer.tagline": "Первый премиальный игровой маркетплейс в Азербайджане. Безопасные платежи, проверенные продавцы, мгновенная доставка.",
  "footer.marketplace": "Маркетплейс",
  "footer.all": "Все товары",
  "footer.games": "Игры",
  "footer.accounts": "Аккаунты",
  "footer.keys": "Ключи",
  "footer.services": "Услуги",
  "footer.account": "Аккаунт",
  "footer.why": "Почему NextPlay?",
  "footer.escrow": "Защита эскроу",
  "footer.instant": "Мгновенная доставка",
  "footer.support24": "Поддержка 24/7",
  "footer.rights": "Все права защищены.",
  "footer.terms": "Условия",
  "footer.privacy": "Конфиденциальность",
  "footer.refund": "Возврат",
};

const DICTS: Record<Lang, Dict> = { az, en, ru };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const I18nCtx = createContext<Ctx>({ lang: "az", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("az");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("np_lang") as Lang | null) : null;
    if (saved && ["az", "en", "ru"].includes(saved)) setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("np_lang", l);
  }

  const t = (k: string) => DICTS[lang][k] ?? DICTS.az[k] ?? k;

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
export const useT = () => useContext(I18nCtx).t;
