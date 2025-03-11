import type { Metadata } from "next"
import "./globals.css"
import { Montserrat } from "next/font/google"
export const metadata: Metadata = {
  title: "Dynamic1 CMS - Manage Casinos Seamlessly",
  description:
    "Dynamic1 Casino Management System (CMS) provides a seamless and efficient way to oversee and optimize casino operations, ensuring high performance, security, and compliance.",
  keywords:
    "Dynamic1 CMS, Casino Management System, CMS, Casino Operations, Slot Machines, Gaming Floor Management, Casino Security, Financial Reports, Performance Monitoring, Compliance",
  applicationName: "Dynamic1 CMS",
  authors: [{ name: "Dynamic1 Team", url: "https://gy.sas.backoffice.ltd" }],
  creator: "Dynamic1 Team",
  publisher: "Dynamic1 Group",
  robots: "index, follow",
  viewport: {
    width: "device-width",
    initialScale: 1.0,
    maximumScale: 5.0,
  },
  themeColor: "#5119E9",
  openGraph: {
    title: "Dynamic1 CMS - Optimize Casino Operations",
    description:
      "A robust casino management system designed for operational efficiency, compliance, and financial transparency.",
    url: "https://gy.sas.backoffice.ltd",
    siteName: "Dynamic1 CMS",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://gy.sas.backoffice.ltd/favicon.png",
        width: 1200,
        height: 630,
        alt: "Dynamic1 CMS - Optimize Casino Operations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@dynamic1cms",
    creator: "@dynamic1cms",
    title: "Dynamic1 CMS - Manage Casinos Seamlessly",
    description:
      "Dynamic1 CMS offers an advanced and powerful way to oversee casino operations with high performance, financial tracking, and compliance management.",
    images: ["https://gy.sas.backoffice.ltd/favicon.png"],
  },
  alternates: {
    canonical: "https://gy.sas.backoffice.ltd",
  },
}

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  )
}
