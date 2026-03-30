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

// Reverse geocoding using OpenStreetMap Nominatim API
const detectLocation = async () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use OpenStreetMap Nominatim API for reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en-US,en;q=0.9',
              }
            }
          );
          
          if (!response.ok) {
            throw new Error('Failed to fetch location data');
          }
          
          const data = await response.json();
          const address = data.address || {};
          
          // Extract location details
          const locationData = {
            state: address.state || address.state_district || '',
            district: address.county || address.district || address.state_district || '',
            taluk: address.suburb || address.town || address.village || address.county || '',
            fullAddress: data.display_name || '',
            lat: latitude,
            lng: longitude
          };
          
          resolve(locationData);
        } catch (error) {
          reject(error);
        }
      },
      (err) => {
        let errorMsg = 'Unable to retrieve your location';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = 'Location permission denied. Please enable location access or enter manually.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = 'Location information unavailable.';
            break;
          case err.TIMEOUT:
            errorMsg = 'Location request timed out.';
            break;
        }
        reject(new Error(errorMsg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: "", mobile: "", email: "", aadhaar: "",
    date_of_birth: "", gender: "", address: "", state: "", district: "", taluk: "",
    password: "", confirm_password: "",
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [abhaId, setAbhaId] = useState("");
  const [abhaAddress, setAbhaAddress] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);

  const updateForm = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const handleDetectLocation = async () => {
    setLocationLoading(true);
    setError("");
    
    try {
      const locationData = await detectLocation();
      
      // Update form with detected location
      setForm(prev => ({
        ...prev,
        state: locationData.state,
        district: locationData.district,
        taluk: locationData.taluk,
        address: locationData.fullAddress
      }));
      
      // Show confirmation UI
      setShowLocationConfirm(true);
      setError("");
    } catch (err) {
      setError(err.message || 'Failed to detect location. Please enter manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLocationConfirm = (isCorrect) => {
    if (isCorrect) {
      // User confirmed, hide the confirmation UI
      setShowLocationConfirm(false);
    } else {
      // User wants to redetect, clear fields and try again
      setForm(prev => ({
        ...prev,
        state: "",
        district: "",
        taluk: "",
        address: ""
      }));
      setShowLocationConfirm(false);
      // Trigger detection again
      handleDetectLocation();
    }
  };

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
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    Mobile Number <span className="required">*</span>
                    {form.mobile.length === 10 && (
                      <svg style={{ width: "16px", height: "16px", color: "#22c55e" }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                  <input type="tel" className="input-field" placeholder="10-digit number"
                    maxLength={10} value={form.mobile}
                    onChange={(e) => updateForm("mobile", e.target.value.replace(/\D/g, ""))} />
                </div>
                <div className="input-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    Email Address <span className="required">*</span>
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
                      <svg style={{ width: "16px", height: "16px", color: "#22c55e" }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                  <input type="email" className="input-field" placeholder="you@domain.com"
                    value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <div className="flex items-center justify-between mb-2">
                  <label>Location <span className="required">*</span></label>
                  {/* Show Detect button only before detection and when mobile/email valid */}
                  {!showLocationConfirm && form.mobile.length === 10 && form.email.includes('@') && (
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={locationLoading}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        background: locationLoading ? "#e5e7eb" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: locationLoading ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: locationLoading ? "none" : "0 2px 8px rgba(59, 130, 246, 0.3)"
                      }}
                      onMouseEnter={(e) => !locationLoading && (e.currentTarget.style.transform = "translateY(-1px)")}
                      onMouseLeave={(e) => !locationLoading && (e.currentTarget.style.transform = "translateY(0)")}
                      title="Auto-detect location using GPS"
                    >
                      {locationLoading ? (
                        <>
                          <span className="spinner" style={{ width: "14px", height: "14px", borderColor: "#9ca3af", borderBottomColor: "transparent" }}></span>
                          <span>Detecting...</span>
                        </>
                      ) : (
                        <>
                          <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Detect Location</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Show confirmation card after detection */}
                {showLocationConfirm ? (
                  <div style={{
                    background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
                    border: "1px solid #bae6fd",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "12px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <svg style={{ width: "20px", height: "20px", color: "#0284c7" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span style={{ fontWeight: "600", color: "#0369a1" }}>Detected Location</span>
                    </div>
                    
                    <div style={{ 
                      background: "white", 
                      borderRadius: "8px", 
                      padding: "12px", 
                      marginBottom: "12px",
                      fontSize: "0.9rem"
                    }}>
                      <div style={{ marginBottom: "6px" }}>
                        <span style={{ color: "#64748b", fontSize: "0.75rem" }}>State:</span>
                        <span style={{ marginLeft: "8px", fontWeight: "500" }}>{form.state || "-"}</span>
                      </div>
                      <div style={{ marginBottom: "6px" }}>
                        <span style={{ color: "#64748b", fontSize: "0.75rem" }}>District:</span>
                        <span style={{ marginLeft: "8px", fontWeight: "500" }}>{form.district || "-"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontSize: "0.75rem" }}>Taluk/Town:</span>
                        <span style={{ marginLeft: "8px", fontWeight: "500" }}>{form.taluk || "-"}</span>
                      </div>
                    </div>

                    <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "12px", textAlign: "center" }}>
                      Is this location correct?
                    </p>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => handleLocationConfirm(true)}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "10px",
                          background: "#22c55e",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#16a34a"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#22c55e"}
                      >
                        <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Yes, Correct
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLocationConfirm(false)}
                        disabled={locationLoading}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "10px",
                          background: locationLoading ? "#e5e7eb" : "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          cursor: locationLoading ? "not-allowed" : "pointer",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => !locationLoading && (e.currentTarget.style.background = "#dc2626")}
                        onMouseLeave={(e) => !locationLoading && (e.currentTarget.style.background = "#ef4444")}
                      >
                        {locationLoading ? (
                          <span className="spinner" style={{ width: "14px", height: "14px", borderColor: "white", borderBottomColor: "transparent" }}></span>
                        ) : (
                          <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                        {locationLoading ? "Detecting..." : "No, Redetect"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <select className="input-field" value={form.state}
                  onChange={(e) => updateForm("state", e.target.value)}>
                  <option value="">Select State</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>District</label>
                  <input type="text" className="input-field" placeholder="Auto-detected or enter manually"
                    value={form.district} onChange={(e) => updateForm("district", e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Taluk / Town</label>
                  <input type="text" className="input-field" placeholder="Auto-detected or enter manually"
                    value={form.taluk} onChange={(e) => updateForm("taluk", e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label>Full Address</label>
                <textarea className="input-field" rows={2} placeholder="Complete address (optional)"
                  value={form.address} onChange={(e) => updateForm("address", e.target.value)} />
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
              <div style={{ 
                padding: "24px", 
                background: "#ffffff", 
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
              }}>
                <p style={{ color: "#4b5563", fontSize: "0.95rem", marginBottom: "16px" }}>
                  Verification code sent securely to mobile ending in<br />
                  <strong style={{ color: "#111827", fontSize: "1.1rem" }}>
                    +91 •••• {form.mobile.slice(-4)}
                  </strong>
                </p>
                
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  margin: "20px 0"
                }}>
                  {[...Array(6)].map((_, i) => (
                    <input 
                      key={i} 
                      type="text" 
                      maxLength={1}
                      value={otp[i] || ""}
                      style={{
                        width: "45px",
                        height: "55px",
                        textAlign: "center",
                        fontSize: "1.5rem",
                        fontWeight: "600",
                        border: "2px solid #d1d5db",
                        borderRadius: "8px",
                        background: "#ffffff",
                        color: "#111827",
                        outline: "none",
                        transition: "all 0.2s ease"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#3b82f6";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.2)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.boxShadow = "none";
                      }}
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
                
                <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "12px" }}>Demo code: <strong style={{ color: "#111827" }}>123456</strong></p>
              </div>

              <div style={{ display: "flex", gap: "16px", marginTop: "20px" }}>
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
