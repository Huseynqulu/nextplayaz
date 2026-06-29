import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/gift-cards/$platform")({
  component: () => <Outlet />,
});
