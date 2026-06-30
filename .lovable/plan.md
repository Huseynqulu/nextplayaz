
# Bütün səhifələrin 3 dilə çevrilməsi (AZ / EN / RU)

Layihədə **124 TSX faylı** və **8,000+ sətir UI kodu** var — hamısı azərbaycanca hardcoded string-lərlə doludur. Bunu bir gedişdə "hər kəlməyə qədər" tərcümə etmək həm risklidir (çoxlu syntax xətaları), həm də 1-2 turn-da reallaşmır. Aşağıdakı reallıqcı yanaşmanı təklif edirəm.

## Yanaşma

1. **Mərkəzi sözlük genişləndirilir** — `src/lib/i18n.tsx` indi ~50 açar saxlayır. Onu **6 modul** üzrə (~400+ açar) böyüdürəm:
   - `common.*` (düymələr, statuslar, formlar, error/success mesajları)
   - `nav.*`, `footer.*` (artıq qismən var)
   - `home.*` (banner, featured, ticker, recently viewed)
   - `market.*` (filter, sort, kategoriyalar, kart etiketləri)
   - `product.*` (təsvir, stok, dəyərləndirmə, mesaj göndər)
   - `cart.*`, `checkout.*`, `wallet.*`, `orders.*`
   - `messages.*`, `support.*`, `profile.*`, `seller.*`, `auth.*`
   - `legal.*` (terms / privacy / refund)

2. **Tərcümələr** AZ/EN/RU üçün hər açar əl ilə yazılır (LLM tərcüməsi, sonradan redaktə oluna bilər).

3. **Səhifələr mərhələli olaraq çevrilir** — prioritet sırası:
   - **Faz 1 (bu turn):** `Header`, `Footer`, `Hero`, `index.tsx`, `marketplace.tsx`, `product.$slug.tsx`, `cart.tsx`, `login.tsx`, `register.tsx`, `support.tsx`, `terms/privacy/refund`, `user-guide.tsx` — yəni ictimai (giriş tələb etməyən) bütün səhifələr.
   - **Faz 2 (növbəti turn):** `_authenticated/` altında müştəri səhifələri — `profile`, `orders`, `wallet`, `messages`, `support-tickets`, `favorites`, `cart`, `seller-dashboard`, `seller-orders`, `seller.tsx`.
   - **Faz 3 (növbəti turn):** Admin və staff panelləri (`admin.tsx`, `/staff`) — bunlar yalnız 2-3 nəfər tərəfindən istifadə olunur, ona görə son prioritet.

4. **Fallback** — hər hansı açar tərcümə olunmasa, sistem avtomatik AZ-yə qayıdır (artıq `i18n.tsx`-də belə işləyir), beləliklə yarımçıq tərcümələr səhifəni sındırmır.

5. **Komponentlər (`src/components/*`)** — `ProductCard`, `Hero`, `Header`, `Footer`, `EmptyState`, `Skeletons`, `OnboardingTour`, `NotificationBell`, `LanguageSwitcher`, `MobileTabBar`, `CommandPalette`, `Breadcrumbs` Faz 1-də çevrilir.

## Faz 1 — bu turn-da edəcəklərim

- `src/lib/i18n.tsx` tam yenidən yazılır: AZ/EN/RU x ~400 açar (modul-modul, oxunaqlı bloklarda).
- Aşağıdakı fayllarda hardcoded AZ string-lər `t("...")` ilə əvəz olunur:
  - `src/components/Header.tsx`
  - `src/components/Footer.tsx`  (mövcuddursa)
  - `src/components/Hero.tsx`
  - `src/components/ProductCard.tsx`
  - `src/components/EmptyState.tsx`
  - `src/components/MobileTabBar.tsx`
  - `src/components/Breadcrumbs.tsx`
  - `src/components/NotificationBell.tsx`
  - `src/components/CommandPalette.tsx`
  - `src/routes/index.tsx`
  - `src/routes/marketplace.tsx`
  - `src/routes/product.$slug.tsx`
  - `src/routes/cart.tsx`
  - `src/routes/login.tsx`, `register.tsx`
  - `src/routes/support.tsx`
  - `src/routes/terms.tsx`, `privacy.tsx`, `refund.tsx`
  - `src/routes/user-guide.tsx`
  - `src/routes/seller.tsx`
  - `src/routes/gift-cards*.tsx`
  - `src/routes/u.$id.tsx`

- Hər səhifənin `head()` metadata-sı (title, description) da dilə uyğun olur.

## Çıxda olan

- **Admin paneli** (`/admin`) və **staff paneli** (`/staff`) — daxili istifadəçilər üçün, AZ qalır (Faz 3-də əlavə oluna bilər).
- **Toast mesajlarındakı dinamik string-lər** kod içində qalanlar tədricən çevriləcək — Faz 1-də ən çox görünənlər (`Çıxış edildi`, `Səbətə əlavə olundu`, vs.) çevrilir.
- **Verilənlər bazasındakı kontent** (məhsul adları, kateqoriya adları, qayda mətnləri) — bunlar istifadəçi tərəfindən daxil edilir, avtomatik tərcümə olunmur. Əgər istəyirsinizsə, sonradan kateqoriyalar üçün `name_en` / `name_ru` sütunları əlavə edə bilərik.

## Texniki qeydlər

- `i18n.tsx`-də `useT()` artıq mövcuddur — yeni kod elə yazıram.
- Variantlı string-lər (`{count} məhsul`) üçün sadə `{var}` əvəzləyici əlavə edirəm: `t("market.count", { count: 5 })`.
- `meta` (head) açarları üçün `t()` istifadə oluna bilməz (SSR əvvəli render olunur), ona görə hər route üçün üç dildə title obyekti `useEffect` ilə document.title-a yazılır.

## Təsdiq

Faz 1-i indi başlayım, yoxsa başqa prioritet sırası istəyirsiniz (məs. əvvəlcə admin paneli, və ya yalnız müəyyən səhifələr)?
