import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Məxfilik Siyasəti — NextPlay.az" },
      { name: "description", content: "NextPlay.az şəxsi məlumatların toplanması, istifadəsi, saxlanması və qorunması ilə bağlı məxfilik siyasəti." },
      { property: "og:title", content: "Məxfilik Siyasəti — NextPlay.az" },
      { property: "og:description", content: "Şəxsi məlumatların qorunması və istifadəsi qaydaları." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://nextplay.az/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://nextplay.az/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Məxfilik Siyasəti"
      updated="29 İyun 2026"
      intro="NextPlay.az istifadəçilərin şəxsi məlumatlarının məxfiliyini ciddi şəkildə qoruyur. Bu sənəd hansı məlumatları topladığımızı, necə istifadə etdiyimizi və hüquqlarınızın necə qorunduğunu izah edir."
      sections={[
        {
          heading: "Toplanan məlumatlar",
          body: [
            "Hesab məlumatları: ad, soyad, e-poçt, telefon nömrəsi, profil şəkli, parol (şifrələnmiş şəkildə).",
            "Verifikasiya məlumatları (satıcılar üçün): şəxsiyyət vəsiqəsinin ön/arxa tərəfi və selfie. Şəxsiyyət sənədləri yalnız hesabın yoxlanılması, təhlükəsizlik, fırıldaqçılığın qarşısının alınması və qanuni öhdəliklərin yerinə yetirilməsi məqsədilə emal edilir. Məlumatlar Məxfilik Siyasətində göstərilən hallar istisna olmaqla paylaşılmır.",
            "Maliyyə məlumatları: cüzdan balansı, balans artırma qəbzləri, pul çıxarma rekvizitləri (kart nömrəsi, m10 hesabı və s.).",
            "Sövdələşmə məlumatları: sifariş tarixçəsi, mesajlaşma, rəylər, mübahisələr.",
            "Texniki məlumatlar: IP ünvan, brauzer növü, cihaz tipi, giriş tarixləri, son aktivlik vaxtı (online/offline statusu üçün).",
          ],
        },
        {
          heading: "Məlumatların istifadə məqsədi",
          body: [
            "Hesabın yaradılması, identifikasiya və autentifikasiya;",
            "Sifarişlərin emalı, eskrow əməliyyatları və mübahisələrin həlli;",
            "Alıcı-satıcı arasında təhlükəsiz kommunikasiyanın təmin edilməsi;",
            "Saxtakarlığın, fırıldaqçılığın və qanunsuz fəaliyyətin qarşısının alınması;",
            "Xidmət keyfiyyətinin yaxşılaşdırılması, statistik analiz;",
            "Qanunvericilikdə nəzərdə tutulan öhdəliklərin yerinə yetirilməsi.",
          ],
        },
        {
          heading: "Məlumatların paylaşılması",
          body: [
            "Şəxsi məlumatlarınız üçüncü tərəflərə satılmır.",
            "Aşağıdakı hallar istisnadır:",
            [
              "Sövdələşmə tərəfdaşı ilə zəruri minimum məlumat (display ad, profil şəkli, online statusu);",
              "Texniki xidmət təminatçıları (hosting, ödəniş prosessoru) — yalnız xidmət göstərmək üçün lazım olan həcmdə;",
              "Qanuni orqanların əsaslandırılmış sorğusu əsasında;",
              "Saxtakarlığın aşkar olunması zamanı digər istifadəçilərə qarşı sübut kimi.",
            ],
          ],
        },
        {
          heading: "Cookie və izləmə texnologiyaları",
          body: [
            "Platforma sessiyanın saxlanması, dil seçimi, təhlükəsizlik və analitika üçün cookie-lərdən istifadə edir.",
            "Brauzer ayarlarından cookie-ləri söndürə bilərsiniz, lakin bu hal Platformanın bəzi funksiyalarının işləməməsinə səbəb ola bilər.",
          ],
        },
        {
          heading: "Məlumatların saxlanma müddəti",
          body: [
            "Hesab məlumatları — hesab aktiv olduğu müddətdə və ondan sonra qanunvericiliyin tələb etdiyi müddətdə (mühasibat, vergi).",
            "Sövdələşmə tarixçəsi və mesajlaşma — minimum 3 il (mübahisə hallarının sübutu üçün).",
            "Verifikasiya sənədləri — satıcı statusu aktiv olduğu müddətdə + 1 il.",
            "Hesab silindikdən sonra ümumiləşdirilmiş anonim statistika saxlanıla bilər.",
          ],
        },
        {
          heading: "Təhlükəsizlik tədbirləri",
          body: [
            "Şifrələr bcrypt alqoritmi ilə hashlənir, heç bir halda açıq mətndə saxlanılmır.",
            "Bütün məlumat ötürmələri HTTPS/TLS şifrələməsi ilə qorunur.",
            "Verifikasiya sənədləri özəl, RLS qoruması olan yaddaşda saxlanılır.",
            "Verilənlər bazasında Row Level Security (RLS) tətbiq olunur — istifadəçilər yalnız öz məlumatlarına çıxış əldə edə bilər.",
          ],
        },
        {
          heading: "İstifadəçinin hüquqları",
          body: [
            "Sizin haqqınızda saxlanılan məlumatlara baxmaq hüququ;",
            "Səhv və ya köhnəlmiş məlumatları düzəltmək hüququ;",
            "Hesabı və əlaqəli məlumatları silmək hüququ (qanunvericilikdən doğan saxlama öhdəlikləri istisna);",
            "Marketinq xəbərdarlıqlarından imtina etmək hüququ;",
            "Mübahisə zamanı şəxsi məlumatların emalı barədə şikayət etmək hüququ.",
            "Hüquqlarınızı həyata keçirmək üçün support@nextplay.az ünvanına müraciət edin.",
          ],
        },
        {
          heading: "Uşaqların məxfiliyi",
          body: [
            "Platforma 18 yaşdan kiçik şəxslər üçün nəzərdə tutulmayıb. 18 yaşdan kiçik şəxsdən şüurlu olaraq məlumat toplamırıq. Belə hal aşkar olunarsa, hesab dərhal bağlanır və məlumatlar silinir.",
          ],
        },
        {
          heading: "Əlaqə",
          body: [
            "Məxfilik siyasəti ilə bağlı sual və müraciətlər: support@nextplay.az",
          ],
        },
      ]}
    />
  );
}
