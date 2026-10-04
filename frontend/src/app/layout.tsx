import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "FlowOps", template: "%s - FlowOps" },
  description: "Antrean exception pesanan marketplace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakartaSans.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-body-md text-on-surface">{children}</body>
    </html>
  );
}
