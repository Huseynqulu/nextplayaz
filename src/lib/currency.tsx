import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Currency = "AZN" | "USD";

// 1 USD ≈ 1.70 AZN (sabit kurs — admin gələcəkdə dəyişə bilər)
const USD_PER_AZN = 1 / 1.7;

const META: Record<Currency, { symbol: string; code: string; label: string; flag: string }> = {
  AZN: { symbol: "₼", code: "AZN", label: "Manat (AZN)", flag: "🇦🇿" },
  USD: { symbol: "$", code: "USD", label: "US Dollar (USD)", flag: "🇺🇸" },
};

type Ctx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Format an AZN-denominated amount in the active currency. */
  format: (aznAmount: number | string | null | undefined, opts?: { decimals?: number }) => string;
  /** Convert AZN → active currency (raw number). */
  convert: (aznAmount: number) => number;
  symbol: string;
};

const CurrencyCtx = createContext<Ctx>({
  currency: "AZN",
  setCurrency: () => {},
  format: (a) => `${Number(a ?? 0).toFixed(2)} ₼`,
  convert: (a) => a,
  symbol: "₼",
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurState] = useState<Currency>("AZN");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("np_currency") as Currency | null;
    if (saved === "AZN" || saved === "USD") setCurState(saved);
  }, []);

  function setCurrency(c: Currency) {
    setCurState(c);
    if (typeof window !== "undefined") localStorage.setItem("np_currency", c);
  }

  function convert(azn: number): number {
    if (!isFinite(azn)) return 0;
    return currency === "USD" ? azn * USD_PER_AZN : azn;
  }

  function format(amount: number | string | null | undefined, opts?: { decimals?: number }) {
    const azn = Number(amount ?? 0);
    if (!isFinite(azn)) return currency === "USD" ? "$0.00" : "0.00 ₼";
    const v = convert(azn);
    const d = opts?.decimals ?? 2;
    const fixed = v.toFixed(d);
    return currency === "USD" ? `$${fixed}` : `${fixed} ₼`;
  }

  return (
    <CurrencyCtx.Provider value={{ currency, setCurrency, format, convert, symbol: META[currency].symbol }}>
      {children}
    </CurrencyCtx.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyCtx);
export const CURRENCY_META = META;
