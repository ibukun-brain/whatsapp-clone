import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { APP_DESCRIPTION, APP_NAME, SERVER_URL } from "@/lib/constants";
import Providers from "./providers";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: `%s | Whatsapp`,
    default: APP_NAME,
  },
  description: APP_DESCRIPTION,
  metadataBase: new URL(SERVER_URL),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${notoSans.variable} antialiased bg-[#fcf5eb] text-[#111b21]`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
