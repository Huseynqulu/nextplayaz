import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Geri Qaytarma Siyasəti — NextPlay.az" },
      { name: "description", content: "NextPlay.az platformasında geri qaytarma, mübahisə və kompensasiya qaydaları." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <LegalPage
      title="Geri Qaytarma və Mübahisə Siyasəti"
      updated="29 İyun 2026"
      intro="NextPlay.az alıcının hüquqlarını eskrow (depozit) sistemi vasitəsilə qoruyur. Bu sənəd hansı hallarda pulun geri qaytarıldığını, mübahisənin necə həll edildiyini və hər bir tərəfin öhdəliklərini izah edir."
      sections={[
        {
          heading: "Eskrow necə işləyir?",
          body: [
            "Sifariş verdikdə pul dərhal satıcıya köçürülmür — Platformanın eskrow (depozit) hesabında dondurulur.",
            "Satıcı məhsulu çatdırır → alıcı yoxlayır → təsdiq edirsə, pul satıcıya açılır.",
            "Alıcı razı deyilsə, etiraz (dispute) yarada bilər; bu zaman administrator işə qarışır və qərar verir.",
          ],
        },
        {
          heading: "Hansı hallarda pul tam geri qaytarılır?",
          body: [
            [
              "Satıcı razılaşdırılmış müddətdə məhsulu çatdırmadıqda;",
              "Çatdırılan məhsul təsvirlə tam uyğunsuzluq təşkil etdikdə (yanlış oyun, fərqli hesab, etibarsız açar);",
              "Hesab/açar artıq istifadə olunmuş və ya bloklanmış vəziyyətdə çatdırıldıqda;",
              "Satıcı sifarişi ləğv etdikdə;",
              "Administrator alıcının xeyrinə qərar verdikdə.",
            ],
            "Bütün geri qaytarmalar alıcının NextPlay cüzdanına 100% məbləğdə qaytarılır və dərhal yeni alış üçün və ya bank hesabına çıxarmaq üçün istifadə oluna bilər.",
          ],
        },
        {
          heading: "Hansı hallarda pul geri qaytarılmır?",
          body: [
            [
              "Alıcı məhsulu qəbul edib istifadəyə başladıqdan sonra fikrini dəyişdirdikdə;",
              "Alıcı satıcı tərəfindən düzgün çatdırılmış hesabın şifrəsini özü dəyişib sonra problem olduğunu iddia etdikdə;",
              "Oyun naşirinin (Steam, Riot, Epic və s.) sonradan tətbiq etdiyi qaydaya görə hesab dondurulduqda və bu, satıcının günahı deyilsə (məsələn, alıcının VPN istifadəsi);",
              "Alıcı 24 saatlıq avtomatik təsdiq müddətini keçirib heç bir etiraz etmədikdə;",
              "Saxta etiraz, saxta sübut və ya fırıldaqçılıq cəhdi aşkar olunduqda.",
            ],
          ],
        },
        {
          heading: "Avtomatik təsdiq qaydası (24 saat)",
          body: [
            "Satıcı məhsulu çatdırdıqdan sonra alıcının yoxlama və təsdiq üçün 24 saatı var.",
            "24 saat ərzində nə təsdiq, nə də etiraz olunmazsa, sistem sifarişi avtomatik təsdiq edir və pul satıcıya açılır.",
            "Bu qayda satıcıları gecikmədən qoruyur. Şübhəniz varsa, müddət bitmədən mütləq “Etiraz et” düyməsindən istifadə edin.",
          ],
        },
        {
          heading: "Etiraz (dispute) prosesi",
          body: [
            "1. Sifarişlərim → müvafiq sifariş → “Etiraz et” düyməsi.",
            "2. Problemi qısa, aydın izah edin və lazım olduqda foto/video sübut əlavə edin.",
            "3. Dispute açıldığı andan etibarən sifarişlə bağlı söhbətə NextPlay Dəstək komandası qoşulur.",
            "4. Hər iki tərəfdən izahat və sübut toplanılır.",
            "5. Administrator 24–72 saat ərzində qərar verir:",
            [
              "Tam geri qaytarma (alıcının xeyrinə);",
              "Qismən geri qaytarma (məbləğin bir hissəsi alıcıya, qalanı satıcıya);",
              "Satıcının xeyrinə qərar (pul satıcıya açılır).",
            ],
          ],
        },
        {
          heading: "Qismən geri qaytarma",
          body: [
            "Bəzi hallarda məhsul qismən uyğun olur (məsələn, hesabda elan olunan skinlərdən bəziləri çatışmır). Bu halda admin qismən geri qaytarma tətbiq edə bilər — məbləğin razılaşdırılmış hissəsi alıcıya, qalanı satıcıya köçürülür.",
          ],
        },
        {
          heading: "Balans artırmaların geri qaytarılması",
          body: [
            "Manual balans artırma (bank köçürməsi, m10) admin tərəfindən təsdiqlənənədək rədd edilə və tam məbləğdə geri qaytarıla bilər.",
            "Təsdiqləndikdən və balansa köçürüldükdən sonra məbləğ pul çıxarma bölməsindən bank hesabına çıxarıla bilər (5% komissiya tutulmaqla).",
          ],
        },
        {
          heading: "Pul çıxarmanın ləğvi",
          body: [
            "Çıxarış müraciəti “Gözləyən” statusda olduğu müddətdə admin tərəfindən rədd edilərsə, tam məbləğ (komissiya daxil) cüzdana geri qaytarılır.",
            "Çıxarış admin tərəfindən təsdiqləndikdən və köçürmə başladıqdan sonra ləğv mümkün deyil.",
          ],
        },
        {
          heading: "Müraciət müddəti",
          body: [
            "Etiraz sifariş tamamlandıqdan sonra 7 təqvim günü ərzində açıla bilər.",
            "Bu müddətdən sonra texniki olaraq dispute mümkün deyil və satıcının xeyrinə tam ödəniş qüvvədə qalır.",
          ],
        },
        {
          heading: "Əlaqə",
          body: [
            "Geri qaytarma və ya mübahisə ilə bağlı suallar: support@nextplay.az və ya “Dəstək” bölməsi.",
          ],
        },
      ]}
    />
  );
}
