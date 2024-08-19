import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ThemeModeScript } from "flowbite-react";

import "./globals.css";
import { Nav } from "./lib/Nav/client";

const poppins = Poppins({
  subsets: ["latin-ext"],
  weight: ["100", "400", "900"]
});

export const metadata: Metadata = {
  title: "blue.moji",
  description: "Bluesky custom emoji system, by @aendra.com"
};

export default function RootLayout({
  children,
  loggedIn = false
}: Readonly<{
  children: React.ReactNode;
  loggedIn: boolean;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeModeScript />
      </head>
      <body className={poppins.className}>
        <Nav loggedIn={loggedIn} />
        {children}
      </body>
    </html>
  );
}
