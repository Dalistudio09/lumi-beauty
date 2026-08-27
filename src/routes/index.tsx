import { createFileRoute } from "@tanstack/react-router";
import { BookingApp } from "@/components/lumi/booking-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <BookingApp />;
}
