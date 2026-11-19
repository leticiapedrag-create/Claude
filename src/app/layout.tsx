import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OSCE Immersive",
  description: "Hospital virtual para treinamento de estações OSCE com pacientes 3D, voz, exame físico simulado e avaliação por checklist.",
  appleWebApp: { capable: true, title: "OSCE Immersive", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#07111d" },
  ],
};

// Aplica o tema salvo antes da hidratação (evita piscar).
const scriptTema = `try{var c=JSON.parse(localStorage.getItem('osce.v2.config')||'{}');var t=c.tema||'sistema';if(t==='sistema'){t=matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='claro'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
