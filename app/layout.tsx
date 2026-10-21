import "./globals.css";
export const metadata = { title: "ComfyRemote v4.2" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
