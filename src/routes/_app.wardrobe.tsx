import { createFileRoute } from "@tanstack/react-router";
import { ProjectQuoteBuilder } from "@/routes/_app.project";

export const Route = createFileRoute("/_app/wardrobe")({
  head: () => ({ meta: [{ title: "Wardrobes & Doors Quote - Shades & Space" }] }),
  component: () => <ProjectQuoteBuilder key="wardrobes" mode="wardrobes" />,
});
