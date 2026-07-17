## Məqsəd

Müştəri məhsulun səhifəsində **"BirBank ilə birbaşa al"** düyməsinə basa bilsin, BirBank ödəniş linkinə keçib ödəyib qəbz yükləsin, admin qəbzi təsdiqlədikdən sonra sifariş avtomatik yaradılıb satıcı ilə söhbət açılsın. Mövcud "Balansdan al" axını dəyişməz qalır — yeni yol paralel əlavə olunur.

## Verilənlər bazası (bir migration)

**`payment_settings` genişləndirilməsi**
- Yeni `link_url TEXT NULL` sütunu (BirBank statik linki üçün).
- Admin panelində `birbank` metoduna link daxil edilir.

**Yeni cədvəl `order_payments`**
- `order_id UUID NULL` (sifariş yaradıldıqdan sonra doldurulur — təsdiq anında)
- `buyer_id UUID` (auth.users)
- `product_id UUID`, `quantity INT`, `discount_code TEXT NULL`
- `amount NUMERIC(12,2)` (BirBanka ödənilən məbləğ)
- `reference TEXT UNIQUE` (avtomatik: `NP-XXXXXX`)
- `receipt_url TEXT`, `receipt_path TEXT`
- `status TEXT` — `pending` / `approved` / `rejected`
- `admin_notes TEXT`, `verified_by UUID`, `verified_at TIMESTAMPTZ`
- `created_at`, `updated_at`
- RLS: alıcı öz sətirini görər/yarada bilər; admin hamısını görüb yeniləyə bilər. GRANT-lar authenticated + service_role üçün.

**Anbar (storage)**: mövcud `receipts` bucket-i istifadə olunur (top-up ilə eyni).

**RPC-lər (SECURITY DEFINER)**
- `create_direct_purchase(product_id, quantity, discount_code, receipt_url, receipt_path)` — alıcı üçün. Məhsul mövcudluğunu və qiyməti yoxlayır, `order_payments` sətrini `pending` statusla yaradır və `reference`-i qaytarır.
- `approve_order_payment(payment_id, admin_notes)` — yalnız admin. Sifarişi mövcud `create_order` daxili məntiqi ilə yaradır (balansdan çıxarma addımı olmadan — buyerin wallet-ına əvvəlcə məbləğ yüklənir, sonra `create_order` çağırılır → beləliklə mövcud kod yolları toxunulmaz qalır). `order_payments.order_id` doldurulur, status `approved`.
- `reject_order_payment(payment_id, reason)` — admin. Status `rejected`, alıcıya bildiriş.

## UI dəyişiklikləri

**`src/routes/product.$slug.tsx`**
- "İndi al" düyməsinin yanına yeni **"BirBank ilə al"** düyməsi (mavi rəngli).
- Yeni dialog (`DirectPurchaseDialog`):
  1. Məbləğ + endirim kodu tətbiqi göstərilir.
  2. "BirBank-a keç" düyməsi — `payment_settings.link_url` yeni tabda açılır.
  3. Ödənişdən sonra qəbz şəkli yükləmə (mövcud top-up-la eyni komponent üsulu).
  4. "Reference: NP-XXXXXX" göstərilir — köçürmə qeydinə yazmaq üçün.
  5. Göndər → RPC → "Ödənişiniz təsdiq gözləyir" toast.
- Şərtlər modal-ı yenidən istifadə olunur.

**Admin paneli**
- Yeni tab: **"Sifariş ödənişləri"** (`AdminOrderPayments.tsx`) — mövcud top-up admin siyahısına oxşar. Qəbzə baxma, təsdiq/rədd, admin qeydi.

**Alıcı sifarişlərim səhifəsi**
- Pending ödənişlər sifariş kartından yuxarıda göstərilir ("Təsdiq gözləyir" badge).

## Fayl siyahısı (nə dəyişəcək)

```text
supabase/migrations/<yeni>.sql          → şema + RPC-lər
src/routes/product.$slug.tsx            → yeni düymə + dialog
src/components/DirectPurchaseDialog.tsx → yeni komponent
src/components/AdminOrderPayments.tsx   → yeni admin tab
src/routes/_authenticated/admin.tsx     → tab qeydiyyatı
src/routes/_authenticated/orders.tsx    → pending ödənişlər bölməsi
```

## Nələr toxunulmur

- Mövcud `create_order` (balansdan alış) — dəyişmir.
- Wallet top-up sistemi — dəyişmir.
- Mövcud sifariş / mesajlaşma / avtomatik təsdiq axını — dəyişmir; sadəcə admin approve anında tetiklənir.

## Riski aşağı salan qərarlar

- Yeni RPC daxilində alıcının wallet-ı müvəqqəti kredit-lənib dərhal `create_order` çağırılır. Beləliklə komissiya hesablanması, konversasiya yaradılması, stok idarəsi kimi mövcud loqika dəyişməz qalır.
- Statik link olduğundan avtomatik uzlaşdırma yoxdur — hər ödəniş yalnız qəbz şəkli və reference kodu ilə əllə təsdiqlənir.
