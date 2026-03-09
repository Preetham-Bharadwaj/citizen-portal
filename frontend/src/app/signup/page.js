"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir",
  "Ladakh","Puducherry","Chandigarh","Andaman & Nicobar Islands",
  "Dadra & Nagar Haveli","Lakshadweep"
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: "", mobile: "", email: "", aadhaar: "",
    date_of_birth: "", gender: "", address: "", state: "", district: "",
    password: "", confirm_password: "",
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [abhaId, setAbhaId] = useState("");
  const [abhaAddress, setAbhaAddress] = useState("");

  const updateForm = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const handleVerifyAadhaar = async () => {
    const { full_name, mobile, email, aadhaar, date_of_birth, gender, state, password, confirm_password } = form;
    if (!full_name || !mobile || !email || !aadhaar || !date_of_birth || !gender || !state || !password) {
      return setError("All marked fields are required.");
    }
    if (password !== confirm_password) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (mobile.length !== 10) return setError("Enter valid 10-digit mobile number.");
    if (aadhaar.length !== 12) return setError("Enter valid 12-digit Secure ID (Aadhaar format).");

    setLoading(true); setError("");
    try {
      await api.verifyAadhaar(aadhaar);
      await api.sendOtp(mobile);
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerifyAndSignup = async () => {
    if (otp.length < 6) return setError("Enter the complete 6-digit code.");
    setLoading(true); setError("");
    try {
      await api.verifyOtp({ mobile: form.mobile, otp });
      const res = await api.signup(form);
      setAbhaId(res.abha_id);
      setAbhaAddress(res.abha_address);
      setStep(3);
      localStorage.setItem("abha_user", JSON.stringify({
        user_id: res.user_id, abha_id: res.abha_id,
        abha_address: res.abha_address, full_name: form.full_name,
      }));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: step === 3 ? "520px" : "600px" }}>
          <div className="auth-header">
            <div className="logo-badge">✦</div>
            <h1>Join HealthVault</h1>
            <p>Your secure, intelligent personal health ecosystem</p>
          </div>

          <div className="steps">
            <div className={`step ${step >= 1 ? (step > 1 ? "completed" : "active") : ""}`}>① Details</div>
            <div className={`step ${step >= 2 ? (step > 2 ? "completed" : "active") : ""}`}>② Verification</div>
            <div className={`step ${step >= 3 ? "active" : ""}`}>③ Success</div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "24px" }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="auth-form">
              <div className="alert alert-info" style={{ marginBottom: "8px" }}>
                <span>🔒</span>
                <span>We use bank-grade encryption to protect your identity.</span>
              </div>

              <div className="input-group">
                <label>Secure Identifier (Aadhaar) <span className="required">*</span></label>
                <input type="text" className="input-field" placeholder="12-digit number for KYC"
                  maxLength={12} value={form.aadhaar}
                  onChange={(e) => updateForm("aadhaar", e.target.value.replace(/\D/g, ""))} />
              </div>

              <div className="input-group">
                <label>Legal Full Name <span className="required">*</span></label>
                <input type="text" className="input-field" placeholder="John Doe"
                  value={form.full_name} onChange={(e) => updateForm("full_name", e.target.value)} />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Date of Birth <span className="required">*</span></label>
                  <input type="date" className="input-field"
                    value={form.date_of_birth} onChange={(e) => updateForm("date_of_birth", e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Gender <span className="required">*</span></label>
                  <select className="input-field" value={form.gender}
                    onChange={(e) => updateForm("gender", e.target.value)}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Mobile Number <span className="required">*</span></label>
                  <input type="tel" className="input-field" placeholder="10-digit number"
                    maxLength={10} value={form.mobile}
                    onChange={(e) => updateForm("mobile", e.target.value.replace(/\D/g, ""))} />
                </div>
                <div className="input-group">
                  <label>Email Address <span className="required">*</span></label>
                  <input type="email" className="input-field" placeholder="you@domain.com"
                    value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label>State / Region <span className="required">*</span></label>
                <select className="input-field" value={form.state}
                  onChange={(e) => updateForm("state", e.target.value)}>
                  <option value="">Select Location</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Create Password <span className="required">*</span></label>
                  <input type="password" className="input-field" placeholder="••••••••"
                    value={form.password} onChange={(e) => updateForm("password", e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Confirm Password <span className="required">*</span></label>
                  <input type="password" className="input-field" placeholder="••••••••"
                    value={form.confirm_password} onChange={(e) => updateForm("confirm_password", e.target.value)} />
                </div>
              </div>

              <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "12px" }}
                onClick={handleVerifyAadhaar} disabled={loading}>
                {loading ? <span className="spinner"></span> : "Verify Identity & Send OTP →"}
              </button>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <div className="auth-form" style={{ textAlign: "center" }}>
              <div style={{ padding: "24px", background: "var(--bg-primary)", borderRadius: "var(--radius-lg)" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                  Verification code sent securely to mobile ending in<br />
                  <strong style={{ color: "var(--text-primary)", fontSize: "1.1rem" }}>
                    +91 •••• {form.mobile.slice(-4)}
                  </strong>
                </p>
                
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
                
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Demo code: <strong>123456</strong></p>
              </div>

              <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                <button className="btn btn-outline btn-lg" style={{ flex: 1 }}
                  onClick={() => { setStep(1); setOtp(""); setError(""); }}>
                  ← Back
                </button>
                <button className="btn btn-primary btn-lg" style={{ flex: 2 }}
                  onClick={handleVerifyAndSignup} disabled={loading}>
                  {loading ? <span className="spinner"></span> : "Confirm Identity ✓"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "4.5rem", marginBottom: "16px", filter: "drop-shadow(0 10px 15px rgba(16, 185, 129, 0.2))" }}>🎉</div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
                Welcome to HealthVault!
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "1.05rem" }}>
                Your unified health identity has been generated successfully.
              </p>

              <div style={{
                background: "linear-gradient(135deg, var(--bg-primary), white)", 
                padding: "24px", borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border-light)", marginBottom: "16px",
                boxShadow: "var(--shadow-sm)"
              }}>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Your Unique Health ID
                </p>
                <p style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", letterSpacing: "0.02em", margin: "8px 0" }}>
                  {abhaId}
                </p>
              </div>

              <div style={{
                background: "var(--success-bg)", padding: "16px", borderRadius: "var(--radius-lg)",
                border: "1px dashed var(--success)", marginBottom: "32px"
              }}>
                <p style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 700, textTransform: "uppercase" }}>HealthVault Username</p>
                <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>{abhaAddress}</p>
              </div>

              <button className="btn btn-primary btn-lg" style={{ width: "100%" }}
                onClick={() => router.push("/dashboard")}>
                Go to Dashboard →
              </button>
            </div>
          )}

          {step !== 3 && (
            <div className="auth-footer">
              Already have a Health ID?{" "}
              <Link href="/login" style={{ fontWeight: 700 }}>Sign In</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
