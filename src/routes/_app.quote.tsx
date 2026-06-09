import { createFileRoute } from "@tanstack/react-router";
import { ProjectQuoteBuilder } from "@/routes/_app.project";

export const Route = createFileRoute("/_app/quote")({
  head: () => ({ meta: [{ title: "Blinds Quote - Shades & Space" }] }),
  component: () => <ProjectQuoteBuilder mode="blinds" />,
});
