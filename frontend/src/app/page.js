"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="auth-container">
      <div style={{ textAlign: "center" }}>
        <div className="spinner spinner-lg" style={{ margin: "0 auto" }}></div>
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
          Loading HealthVault...
        </p>
      </div>
    </div>
  );
}
