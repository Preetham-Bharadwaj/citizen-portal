import "./globals.css";

export const metadata = {
  title: "HealthVault – Secure Medical Records",
  description: "Your modern, secure personal health vault. Manage your health records, upload medical reports, and track your complete medical history seamlessly.",
  keywords: "health records, digital health, startup, modern saas, medtech, personal health",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
