import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/gift-cards")({
  component: () => <Outlet />,
  head: () => ({
    meta: [
      { title: "Hədiyyə Kartları — NextPlay.az" },
      { name: "description", content: "PlayStation, Steam, Xbox, Netflix və digər platformaların hədiyyə kartları. Ən ucuz qiymətlər, ani çatdırılma." },
      { property: "og:title", content: "Hədiyyə Kartları — NextPlay.az" },
      { property: "og:description", content: "Bütün məşhur platformaların gift kartları bir yerdə." },
    ],
  }),
  errorComponent: () => <div className="p-10 text-center">Xəta baş verdi</div>,
  notFoundComponent: () => <div className="p-10 text-center">Tapılmadı</div>,
});
