import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "İstifadə Şərtləri — NextPlay.az" },
      { name: "description", content: "NextPlay.az platformasından istifadə qaydaları, hüquq və öhdəliklər, qadağan edilmiş əməllər və hesabların idarə olunması." },
      { property: "og:title", content: "İstifadə Şərtləri — NextPlay.az" },
      { property: "og:description", content: "NextPlay.az istifadəçi razılığı və platforma qaydaları." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://nextplay.az/terms" },
    ],
    links: [{ rel: "canonical", href: "https://nextplay.az/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="İstifadə Şərtləri"
      updated="29 İyun 2026"
      intro="Bu şərtlər NextPlay.az (bundan sonra — Platforma) və istifadəçilər arasındakı münasibətləri tənzimləyir. Qeydiyyatdan keçərək və ya Platformadan istifadə edərək siz aşağıdakı şərtlərin hamısını qəbul etmiş sayılırsınız."
      sections={[
        {
          heading: "Ümumi müddəalar",
          body: [
            "NextPlay.az — oyun hesabları, oyun daxili əşyalar, açarlar, gift-kartlar, xidmətlər və digər rəqəmsal məhsulların alıcı-satıcı (P2P) bazasında alqı-satqısı üçün vasitəçilik edən elektron platformadır.",
            "Platforma yalnız vasitəçi rolunu oynayır və üçüncü tərəflər (satıcılar) tərəfindən təqdim olunan məhsulların orijinal sahibi deyil. Lakin sövdələşmənin təhlükəsizliyini eskrow (depozit) sistemi vasitəsilə təmin edir.",
            "Platformadan istifadə etmək üçün istifadəçi ən azı 18 yaşda olmalı və ya valideyn/qəyyumun yazılı icazəsinə sahib olmalıdır.",
          ],
        },
        {
          heading: "Hesabın qeydiyyatı və təhlükəsizlik",
          body: [
            "Qeydiyyat zamanı təqdim edilən bütün məlumatların düzgün, tam və aktual olması istifadəçinin məsuliyyətindədir.",
            "Bir istifadəçi yalnız bir əsas hesab yarada bilər. Bir neçə hesabın eyni şəxs tərəfindən istifadə edilməsi qadağandır və hesabların bloklanmasına səbəb olur.",
            "Şifrənin, OAuth giriş məlumatlarının və hesab balansının qorunması tamamilə istifadəçinin məsuliyyətindədir.",
            "Hesabınızla bağlı şübhəli fəaliyyət gördükdə dərhal support@nextplay.az ünvanına yazın.",
          ],
        },
        {
          heading: "Satıcı statusu və verifikasiya",
          body: [
            "Platformanın təhlükəsizliyini qorumaq və fırıldaqçılıq riskini azaltmaq üçün satıcılardan şəxsiyyət təsdiqi tələb oluna bilər.",
            "Şəxsiyyət sənədləri yalnız hesabın yoxlanılması, təhlükəsizlik, fırıldaqçılığın qarşısının alınması və qanuni öhdəliklərin yerinə yetirilməsi məqsədilə emal edilir. Məlumatlar Məxfilik Siyasətində göstərilən hallar istisna olmaqla paylaşılmır.",
            "Satıcı təsdiq olunduqdan sonra məhsul yerləşdirə, sifariş qəbul edə və balans çıxara bilər.",
            "Saxta sənəd təqdim edən istifadəçinin hesabı dərhal və daimi olaraq bloklanır, balansı isə zərərçəkmişlərin kompensasiyasına yönəldilə bilər.",
          ],
        },
        {
          heading: "Eskrow (depozit) sistemi",
          body: [
            "Hər alış zamanı alıcının ödədiyi məbləğ dərhal satıcıya keçmir — Platformanın eskrow hesabında saxlanılır.",
            "Pul yalnız aşağıdakı hallardan biri baş verdikdə satıcıya köçürülür:",
            [
              "Alıcı sifarişi əl ilə təsdiq etdikdə;",
              "Sifariş çatdırıldıqdan sonra 24 saat ərzində alıcı etiraz etmədikdə (avtomatik təsdiq);",
              "Mübahisə zamanı administrator satıcının xeyrinə qərar verdikdə.",
            ],
            "Platforma hər tamamlanmış satışdan 5% xidmət haqqı tutur. Bu məbləğ satıcının balansına köçürülmür, Platformanın xidmət gəliridir.",
          ],
        },
        {
          heading: "Qadağan edilmiş məhsul və əməllər",
          body: [
            "Platformada aşağıdakı kateqoriyalı məhsul və xidmətlərin satışı qəti qadağandır:",
            [
              "Oğurlanmış, hack edilmiş və ya qeyri-qanuni yolla əldə edilmiş hesablar;",
              "Cheat, hack proqramları, məlumat oğurlayan və ya zərərli proqram təminatı;",
              "Real pul, kriptovalyuta, qiymətli kağızlar və ya maliyyə alətləri;",
              "İntellektual mülkiyyət hüquqlarını pozan kontent;",
              "Yaş məhdudiyyəti olan və ya qanunvericiliklə qadağan edilmiş hər hansı kontent.",
            ],
            "Aşağıdakı əməllər qadağandır:",
            [
              "Saxta sifariş, saxta rəy, saxta dispute yaratmaq;",
              "Sövdələşməni Platformadan kənara çıxarmağa cəhd etmək (komissiyadan yayınma);",
              "Başqa istifadəçilərə təzyiq, təhqir, hədə-qorxu;",
              "Avtomatlaşdırılmış skript və botların icazəsiz istifadəsi.",
            ],
          ],
        },
        {
          heading: "Komissiyalar və ödənişlər",
          body: [
            "Satıcıdan: hər tamamlanmış satışdan 5% komissiya tutulur.",
            "Pul çıxarma: hər çıxarış əməliyyatından 5% xidmət haqqı tutulur. Minimum çıxarış məbləği 20 AZN-dir.",
            "Balans artırma: hazırda manual (bank köçürməsi / m10) üsul ilə həyata keçirilir və admin tərəfindən təsdiqlənir.",
            "Bütün tarifələr əvvəlcədən bildirilmədən dəyişdirilə bilər; dəyişiklik yalnız tətbiq tarixindən sonrakı əməliyyatlara aiddir.",
          ],
        },
        {
          heading: "Hesabın dayandırılması və bağlanması",
          body: [
            "Platforma aşağıdakı hallarda istifadəçinin hesabını müvəqqəti dayandıra və ya daimi bağlaya bilər:",
            [
              "Bu Şərtlərin pozulması;",
              "Saxtakarlıq, fırıldaqçılıq və ya digər istifadəçilərə zərər verən fəaliyyət;",
              "Çoxsaylı əsaslı şikayət;",
              "Saxta sənəd və ya saxta identifikasiya təşəbbüsü.",
            ],
            "Hesab bağlanarkən eskrow-da olan vəsait həll edilməmiş sifarişlər üçün dondurulur və mübahisənin nəticəsindən asılı olaraq tərəflər arasında bölüşdürülür.",
          ],
        },
        {
          heading: "Məsuliyyət məhdudiyyəti",
          body: [
            "NextPlay.az satıcının təqdim etdiyi məhsulun keyfiyyətinə birbaşa zəmanət vermir, lakin eskrow və mübahisə sistemi vasitəsilə alıcının haqqını qorumağa zəmanət verir.",
            "Platforma fors-major hallarında (oyun naşirinin hesabı bloklaması, server problemləri, qanunvericilik dəyişiklikləri) yaranan dolayı zərərə görə məsuliyyət daşımır.",
            "Maksimal məsuliyyət hədsi konkret sövdələşmə üzrə alıcının ödədiyi məbləğ ilə məhdudlaşır.",
          ],
        },
        {
          heading: "Şərtlərə dəyişikliklər",
          body: [
            "Platforma istənilən vaxt bu Şərtlərə birtərəfli qaydada dəyişiklik etmək hüququnu özündə saxlayır.",
            "Əsaslı dəyişikliklər saytda elan və/və ya e-poçt vasitəsilə bildiriləcək. Dəyişikliklərdən sonra Platformadan istifadəni davam etdirməniz yeni şərtləri qəbul etdiyiniz mənasına gəlir.",
          ],
        },
      ]}
    />
  );
}
