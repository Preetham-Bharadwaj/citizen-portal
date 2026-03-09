"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [useOtp, setUseOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    if (!identifier) return setError("Enter your Health ID or Mobile Number");
    setLoading(true); setError("");
    try {
      await api.sendOtp(identifier);
      setOtpSent(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier) return setError("Enter your Health ID or Mobile Number");
    setLoading(true); setError("");
    try {
      const res = await api.login({
        identifier,
        ...(useOtp ? { otp: otp || "123456" } : { password }),
      });
      localStorage.setItem("abha_user", JSON.stringify({
        user_id: res.user_id,
        abha_id: res.abha_id,
        abha_address: res.abha_address,
        full_name: res.full_name,
      }));
      router.push("/dashboard");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo-badge">✦</div>
            <h1>HealthVault</h1>
            <p>Welcome back to your secure health space</p>
          </div>

          {/* Demo Banner */}
          <div className="alert alert-info" style={{ marginBottom: "24px" }}>
            <span style={{ fontSize: "1.2rem" }}>✨</span>
            <div>
              <strong>Demo Login</strong><br/>
              Mobile: <strong>9876543210</strong> <br/>
              Password: <strong>demo1234</strong>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "20px" }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="identifier">Health ID / Mobile Number</label>
              <input id="identifier" type="text" className="input-field"
                placeholder="Enter unique ID or 10-digit mobile"
                value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>

            {!useOtp ? (
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" className="input-field"
                  placeholder="Enter your password"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            ) : (
              !otpSent ? (
                <button type="button" className="btn btn-outline btn-lg" style={{ width: "100%" }}
                  onClick={handleSendOtp} disabled={loading}>
                  {loading ? <span className="spinner"></span> : "📲 Send OTP via SMS"}
                </button>
              ) : (
                <div className="input-group" style={{ textAlign: "center" }}>
                  <label>Enter 6-digit verification code</label>
                  <div className="otp-container">
                    {[...Array(6)].map((_, i) => (
                      <input key={i} type="text" className="otp-input" maxLength={1}
                        value={otp[i] || ""}
                        onChange={(e) => {
                          if (/^\d*$/.test(e.target.value)) {
                            const n = otp.substring(0, i) + e.target.value + otp.substring(i + 1);
                            setOtp(n);
                            if (e.target.value && e.target.nextSibling) e.target.nextSibling.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otp[i] && e.target.previousSibling)
                            e.target.previousSibling.focus();
                        }} />
                    ))}
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "8px" }}>
                    Demo code: <strong>123456</strong>
                  </p>
                </div>
              )
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "8px" }} disabled={loading}>
              {loading ? <span className="spinner"></span> : "Sign In to Vault →"}
            </button>

            <div className="divider">OR</div>

            <button type="button" className="btn btn-ghost btn-lg" style={{ width: "100%" }}
              onClick={() => { setUseOtp(!useOtp); setOtpSent(false); setOtp(""); }}>
              {useOtp ? "🔑 Use password instead" : "📲 Sign in without password (OTP)"}
            </button>
          </form>

          <div className="auth-footer">
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ fontWeight: 700 }}>Claim your Health ID</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
