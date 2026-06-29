import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/gift-cards")({
  component: () => <Outlet />,
  errorComponent: () => <div className="p-10 text-center">Xəta baş verdi</div>,
  notFoundComponent: () => <div className="p-10 text-center">Tapılmadı</div>,
});
