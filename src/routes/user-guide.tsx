import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  ShieldCheck,
  Wallet,
  IdCard,
  LifeBuoy,
  PackagePlus,
  Store,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Mail,
  Ban,
  Eye,
  Video,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/user-guide")({
  component: UserGuidePage,
  head: () => ({
    meta: [
      { title: "Yeni İstifadəçi Bələdçisi — NextPlay.az" },
      { name: "description", content: "NextPlay.az platformasından təhlükəsiz istifadə üçün addım-addım bələdçi: qeydiyyat, alış, satış və dispute." },
      { property: "og:title", content: "Yeni İstifadəçi Bələdçisi — NextPlay.az" },
      { property: "og:description", content: "NextPlay.az-dan təhlükəsiz istifadə üçün addım-addım bələdçi." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://nextplay.az/user-guide" },
    ],
    links: [{ rel: "canonical", href: "https://nextplay.az/user-guide" }],
  }),
});

function Section({
  icon: Icon,
  title,
  step,
  children,
}: {
  icon: any;
  title: string;
  step: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card-gradient p-6 sm:p-8 card-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-neon/15 border border-neon/30 text-neon">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-semibold text-neon uppercase tracking-wider">{step}</div>
          <h2 className="font-display text-xl sm:text-2xl font-bold">{title}</h2>
        </div>
      </div>
      <div className="text-sm sm:text-base text-muted-foreground leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function UserGuidePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-hero">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon/15 border border-neon/30 text-neon text-xs font-semibold mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Yeni İstifadəçi Bələdçisi
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold">
              NextPlay.az-dan Necə İstifadə Etməli?
            </h1>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Təhlükəsiz alış-veriş üçün hazırladığımız 8 addımlıq bələdçi. Bu məlumatları
              sondan-əvvələ qədər oxusan, NextPlay.az-ı problemsiz istifadə etməyi öyrənəcəksən.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mt-8 text-left">
              {[
                { i: ShieldCheck, t: "Təhlükəsiz Alış-veriş", d: "SSL qorumalı escrow sistemi" },
                { i: Sparkles, t: "4.7 / 5", d: "İstifadəçi məmnuniyyəti" },
                { i: LifeBuoy, t: "Sürətli Dəstək", d: "Gün ərzində cavab" },
              ].map((c, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card/60 p-4 flex items-start gap-3"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-neon/15 text-neon shrink-0">
                    <c.i className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold">{c.t}</div>
                    <div className="text-xs text-muted-foreground">{c.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-5">
          <Section icon={Sparkles} step="Addım 1 / 8" title="NextPlay.az-a Xoş Gəldiniz!">
            <p>
              <strong className="text-foreground">Dəyərli istifadəçimiz,</strong> NextPlay.az —
              Azərbaycanın güvənli rəqəmsal alış-veriş platformasıdır. Yeni qoşulan hər istifadəçiyə
              bu bələdçini təqdim edirik ki, platformamızdan maksimum faydalanasınız.
            </p>
            <div className="rounded-xl border border-border bg-surface/50 p-4">
              <div className="font-semibold text-foreground mb-2">Niyə NextPlay.az?</div>
              <ul className="space-y-1.5 list-disc pl-5">
                <li>Escrow sistemi ilə qorunan ödənişlər</li>
                <li>Sektordan aşağı 5% komissiya</li>
                <li>Doğrulanmış satıcı təminatı</li>
                <li>Mağaza aç və müntəzəm gəlir əldə et</li>
                <li>AZN bank hesabına nəğd çıxarış</li>
              </ul>
            </div>
          </Section>

          <Section icon={Wallet} step="Addım 2 / 8" title="Cüzdana təhlükəsiz balans yükləmək">
            <p>
              NextPlay.az-da cüzdanına bank köçürməsi və ya admin tərəfindən təsdiqlənən manual
              yükləmə üsulu ilə balans əlavə edə bilərsən. Çek/qəbz faylını yüklə — admin
              təsdiqlədikdən sonra balansın avtomatik artır.
            </p>
            <Link
              to="/wallet"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-neon text-background font-semibold text-sm neon-ring hover:scale-[1.02] transition"
            >
              <Wallet className="h-4 w-4" /> Cüzdana balans yüklə
            </Link>
          </Section>

          <Section icon={IdCard} step="Addım 3 / 8" title="Şəxsiyyət məlumatlarını təsdiqləmək">
            <p>
              Saytı daha təhlükəsiz etmək üçün <strong className="text-foreground">satıcıların</strong>{" "}
              şəxsiyyət doğrulaması məcburidir: e-poçt, şəxsiyyət vəsiqəsi və selfie. Alıcı kimi
              bilməlisən ki, qarşındakı satıcı bu mərhələləri keçmiş şəxsdir.
            </p>
            <div className="rounded-xl border border-neon/30 bg-neon/5 p-4 text-foreground">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-neon mt-0.5 shrink-0" />
                <div className="text-sm">
                  <strong>Məxfilik təminatı:</strong> Bu məlumatları heç bir 3-cü şəxs və ya
                  qurumla bölüşmürük. Yalnız məhkəmə-istintaq orqanlarının rəsmi sorğusu əsasında
                  paylaşıla bilər.
                </div>
              </div>
            </div>
          </Section>

          <Section icon={LifeBuoy} step="Addım 4 / 8" title="Dəstək sistemi və canlı yardım">
            <p>
              Sifariş və ödənişlə bağlı problemlər üçün dəstək komandamıza müraciət göndərə
              bilərsən. Ümumi suallar üçün isə FAQ bölməsinə bax.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface/50 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageCircle className="h-4 w-4 text-neon" />
                  <div className="font-semibold text-foreground">Dəstək müraciəti</div>
                </div>
                <p className="text-xs">Sifariş, ödəniş və hesab problemləri üçün</p>
                <Link
                  to="/support-tickets"
                  className="inline-block mt-3 text-sm text-neon font-semibold hover:underline"
                >
                  Müraciət göndər →
                </Link>
              </div>
              <div className="rounded-xl border border-border bg-surface/50 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Mail className="h-4 w-4 text-neon" />
                  <div className="font-semibold text-foreground">E-poçt</div>
                </div>
                <p className="text-xs">İş birliyi və ban etirazları:</p>
                <div className="mt-2 text-sm text-foreground font-mono">support@nextplay.az</div>
              </div>
            </div>
          </Section>

          <Section icon={PackagePlus} step="Addım 5 / 8" title="Necə elan / məhsul yerləşdirmək?">
            <p className="font-semibold text-foreground">Elan yerləşdirmək tamamilə pulsuzdur!</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Hesabına daxil ol</li>
              <li>Satıcı panelinə keç və “Məhsul əlavə et”-ə bas</li>
              <li>Kateqoriya və alt kateqoriya seç</li>
              <li>Məhsul detallarını, şəkillərini və qiymətini doldur</li>
              <li>Anında çatdırılma seçirsənsə, stok elementlərini alt-alta əlavə et</li>
              <li>Yayımla — məhsulun anında marketdə görünəcək</li>
            </ol>
          </Section>

          <Section icon={Store} step="Addım 6 / 8" title="Necə Mağaza Olmaq?">
            <p className="font-semibold text-foreground">Müntəzəm Gəlir Fürsəti!</p>
            <p>
              NextPlay.az-da mağaza açıb rəqəmsal məhsullar satmaqla davamlı gəlir əldə edə
              bilərsən.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface/50 p-4">
                <div className="font-semibold text-foreground mb-2">Mağaza üstünlükləri</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Özəl mağaza səhifəsi</li>
                  <li>Professional görünüş</li>
                  <li>Satış analitikası</li>
                  <li>Boost / promosyon imkanı</li>
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-surface/50 p-4">
                <div className="font-semibold text-foreground mb-2">Tələblər</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>E-poçt doğrulaması</li>
                  <li>Şəxsiyyət doğrulaması</li>
                  <li>Telefon doğrulaması</li>
                  <li>Aktiv hesab</li>
                </ul>
              </div>
            </div>
            <Link
              to="/seller"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-neon text-background font-semibold text-sm neon-ring hover:scale-[1.02] transition"
            >
              <Store className="h-4 w-4" /> Satıcı müraciəti göndər
            </Link>
          </Section>

          <Section icon={AlertTriangle} step="Addım 7 / 8" title="Vacib Təhlükəsizlik Xəbərdarlıqları">
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  i: Ban,
                  t: "Heç vaxt paylaşma",
                  d: "Şəxsi məlumatlarını (telefon, ünvan, kart məlumatı) heç kimlə paylaşma!",
                },
                {
                  i: Eye,
                  t: "Hər zaman təsdiqlə",
                  d: "Şübhən olduqda dəstək komandasına müraciət et.",
                },
                {
                  i: Video,
                  t: "Qeyd saxla",
                  d: "Alış-veriş prosesini ekran qeydiyyatına al.",
                },
                {
                  i: AlertTriangle,
                  t: "Barter qəbul etmə",
                  d: "Barter (takas) əməliyyatlarını dəstəkləmirik. Qəbul etmə.",
                },
              ].map((r, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <r.i className="h-4 w-4 text-destructive" />
                    <div className="font-semibold text-foreground">{r.t}</div>
                  </div>
                  <p className="text-xs">{r.d}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-border bg-surface/50 p-4 text-sm">
              <div className="font-semibold text-foreground mb-2">Sayt daxilində qaydalar:</div>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong className="text-foreground">Sayt xarici yönləndirmə qadağandır</strong>{" "}
                  (Discord, WhatsApp, Telegram və s.). Sayt xaricində edilən razılaşmalar bizim
                  tərəfimizdən qəbul edilmir.
                </li>
                <li>Sayt xarici bağlantı / proqram göndərənlərə inanma.</li>
                <li>
                  <strong className="text-foreground">Barter (takas)</strong> qəti qadağandır,
                  hətta təklifi belə qəbul etmə.
                </li>
                <li>Söyüş, hədə-qorxu və hörmətsiz davranış qadağandır.</li>
                <li>Spam / flood mesajlaşma qadağandır.</li>
                <li>
                  Satıcı məhsulu təhvil verməmiş səndən sifarişi təsdiqləməyini istəyirsə —{" "}
                  <strong className="text-foreground">qəbul etmə</strong> və bizə bildir.
                </li>
                <li>
                  Özünü “NextPlay yönəticisi / canlı dəstək” adı altında təqdim edənlərə inanma və
                  dərhal bizə xəbər ver.
                </li>
              </ul>
            </div>
          </Section>

          <Section icon={CheckCircle2} step="Addım 8 / 8" title="Təşəkkürlər!">
            <p>
              Bu bələdçidə təqdim etdiyimiz təhlükəsizlik məlumatlarını oxuyub anladıqdan sonra
              platformamızda daha güvənli alış-veriş edə biləcəksən. Hər hansı sual yarandıqda
              dəstək komandamızla əlaqə saxla.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-neon text-background font-semibold neon-ring hover:scale-[1.02] transition"
              >
                Markete keç
              </Link>
              <Link
                to="/support-tickets"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border bg-surface hover:bg-surface/70 font-semibold transition"
              >
                <LifeBuoy className="h-4 w-4" /> Dəstək ilə əlaqə
              </Link>
            </div>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
