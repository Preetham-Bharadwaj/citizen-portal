"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [family, setFamily] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState("overview");

  // Upload state
  const [file, setFile] = useState(null);
  const [uploadRecordId, setUploadRecordId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOverRecord, setDragOverRecord] = useState(null);

  // Record expansion
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");

  // Family modal
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyStep, setFamilyStep] = useState(1);
  const [familyForm, setFamilyForm] = useState({ abha_id: "", relation: "", otp: "" });
  const [familyOtpInfo, setFamilyOtpInfo] = useState({ masked_mobile: "", demo_otp: "" });
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyError, setFamilyError] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Analytics Quick View
  const [analyticView, setAnalyticView] = useState(null); // 'hospitals', 'prescriptions', 'treatments'
  const [medsTrack, setMedsTrack] = useState({}); // Tracking medicine intake
  const [analyticSearch, setAnalyticSearch] = useState("");

  // Viewing Family Records
  const [viewingFamilyMember, setViewingFamilyMember] = useState(null);
  const [familyRecordsList, setFamilyRecordsList] = useState([]);

  // Profile Modal
  const [showProfileModal, setShowProfileModal] = useState(false);

  // QR Code Modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(-1); // -1: none, 0-4: stages
  const [newFile, setNewFile] = useState(null);
  const [newUploadError, setNewUploadError] = useState("");

  // Document Viewer
  const [showDocModal, setShowDocModal] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [docTitle, setDocTitle] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("abha_user");
    if (!stored) { router.replace("/login"); return; }
    const u = JSON.parse(stored);
    setUser(u);

    Promise.all([
      api.getProfile(u.user_id).catch(() => null),
      api.getRecords(u.user_id).catch(() => ({ records: [] })),
      api.getFamily(u.user_id).catch(() => ({ members: [] })),
    ]).then(([p, r, f]) => {
      if (p?.profile) setProfile(p.profile);
      if (r?.records) setRecords(r.records);
      if (f?.members) setFamily(f.members);
      setLoading(false);
    });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("abha_user");
    router.replace("/login");
  };

  const refreshRecords = () => {
    if (user) api.getRecords(user.user_id).then((r) => setRecords(r.records || [])).catch(() => {});
  };

  const refreshFamily = () => {
    if (user) api.getFamily(user.user_id).then((f) => setFamily(f.members || [])).catch(() => {});
  };

  // Upload handlers
  const handleFileSelect = (f, recordId) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(f.type)) { setUploadError("Only PDF, JPG, PNG files allowed"); return; }
    setFile(f); setUploadRecordId(recordId); setUploadError("");
  };

  const handleInlineUpload = async (recordId) => {
    if (!file || uploadRecordId !== recordId || !user) return;
    setUploading(true); setUploadError("");
    try {
      await api.uploadToRecord(user.user_id, recordId, file);
      setFile(null); setUploadRecordId(null);
      refreshRecords();
    } catch (err) { setUploadError(err.message); }
    finally { setUploading(false); }
  };

  // Add family member
  const handleVerifyFamily = async () => {
    if (!familyForm.abha_id || !familyForm.relation) {
      setFamilyError("Please enter Health ID and Relation"); return;
    }
    setFamilyLoading(true); setFamilyError("");
    try {
      const res = await api.verifyFamilyAbha(user.user_id, familyForm.abha_id);
      setFamilyOtpInfo({ masked_mobile: res.masked_mobile, demo_otp: res.demo_otp });
      setFamilyStep(2);
    } catch (err) { setFamilyError(err.message); }
    finally { setFamilyLoading(false); }
  };

  const handleConfirmFamily = async () => {
    if (!familyForm.otp) {
      setFamilyError("Please enter OTP"); return;
    }
    setFamilyLoading(true); setFamilyError("");
    try {
      await api.confirmFamilyAbha(user.user_id, {
        abha_id: familyForm.abha_id,
        relation: familyForm.relation,
        otp: familyForm.otp
      });
      refreshFamily();
      closeFamilyModal();
    } catch (err) { setFamilyError(err.message); }
    finally { setFamilyLoading(false); }
  };

  const closeFamilyModal = () => {
    setShowFamilyModal(false);
    setFamilyStep(1);
    setFamilyForm({ abha_id: "", relation: "", otp: "" });
    setFamilyOtpInfo({ masked_mobile: "", demo_otp: "" });
    setFamilyError("");
  };

  const handleViewReport = (record) => {
    const url = api.getDocumentUrl(user.user_id, record.record_id);
    setDocUrl(url);
    setDocTitle(record.file_name || "Medical Report");
    setShowDocModal(true);
  };

  const handleDeleteReport = async (record) => {
    if (!confirm(`Are you sure you want to delete the report "${record.file_name}"?`)) return;
    try {
      await api.deleteDocument(user.user_id, record.record_id);
      refreshRecords(); // Refresh the list
    } catch (err) {
      alert("Failed to delete report: " + err.message);
    }
  };

  const toggleMedTrack = (medKey, medName) => {
    const isNowTaken = !medsTrack[medKey];
    setMedsTrack(prev => ({ ...prev, [medKey]: isNowTaken }));
    
    // Show alert message
    if (isNowTaken) {
      alert(`🔔 Reminder Set: You marked "${medName}" as TAKEN. Great job!`);
    } else {
      alert(`⚠️ Attention: You unmarked "${medName}". Please ensure you follow your doctor's dosage.`);
    }
  };

  const handleNewUpload = async () => {
    if (!newFile || !user) return;
    setNewUploadError("");
    setUploadProgress(0);
    
    try {
      // Simulate stage transitions for premium UX
      const timer = (ms) => new Promise(res => setTimeout(res, ms));
      
      await timer(800); setUploadProgress(1); // OCR
      await timer(1200); setUploadProgress(2); // Layout
      await timer(1000); setUploadProgress(3); // PII
      
      await api.uploadDocument(user.user_id, newFile);
      
      await timer(600); setUploadProgress(4); // Complete
      
      refreshRecords();
      setNewFile(null);
      setTimeout(() => {
        setUploadProgress(-1);
        setActiveTab("records");
      }, 2000);
      
    } catch (err) {
      setNewUploadError(err.message);
      setUploadProgress(-1);
    }
  };

  const ongoingRecords = records.filter(r => 
    r.treatment_status === "Ongoing" || r.treatment_status === "Follow-up Required"
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner spinner-lg" style={{ margin: "0 auto" }}></div>
          <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>Loading your health records...</p>
        </div>
      </div>
    );
  }

  const initials = (profile?.full_name || user?.full_name || "U").split(" ").map((n) => n[0]).join("").toUpperCase();
  const sortedRecords = [...records].reverse();
  const filteredRecords = sortedRecords.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.diagnosis.toLowerCase().includes(q) || r.doctor_name.toLowerCase().includes(q) ||
      r.hospital_name.toLowerCase().includes(q) || (r.medicines || []).some((m) =>
        (typeof m === "string" ? m : m.name || "").toLowerCase().includes(q));
  });

  const stages = [
    { label: "PaddleOCR", desc: "Text Extraction" },
    { label: "LayoutLMv3", desc: "Document Structuring" },
    { label: "Presidio", desc: "PII Detection" },
    { label: "Complete", desc: "Saved to Records" },
  ];

  const uniqueHospitals = [...new Set(records.map((r) => r.hospital_name))];
  const totalMeds = records.reduce((acc, r) => acc + (r.medicines?.length || 0), 0);
  const ongoingCount = records.filter((r) => r.treatment_status === "Ongoing" || r.treatment_status === "Follow-up Required").length;

  return (
    <>
    <div className="dashboard-layout">



        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="logo-icon">✦</div>
            <h2>HealthVault</h2>
          </div>

          <nav className="sidebar-nav">
            <button className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}>
              <span className="nav-icon">📊</span> Overview
            </button>
            <button className={`nav-item ${activeTab === "records" ? "active" : ""}`}
              onClick={() => setActiveTab("records")}>
              <span className="nav-icon">📋</span> Medical Records
            </button>

            <button className={`nav-item ${activeTab === "family" ? "active" : ""}`}
              onClick={() => setActiveTab("family")}>
              <span className="nav-icon">👨‍👩‍👧‍👦</span> Family Members
            </button>

            <button className={`nav-item ${activeTab === "upload" ? "active" : ""}`}
              onClick={() => setActiveTab("upload")}>
              <span className="nav-icon">📤</span> Upload Report
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user" onClick={() => setShowProfileModal(true)} style={{ cursor: "pointer", transition: "all 0.2s" }} title="View Profile Details">
              <div className="sidebar-avatar">{initials}</div>
              <div className="sidebar-user-info">
                <p className="user-name">{profile?.full_name || user?.full_name}</p>
                <p className="user-id">{profile?.abha_id || user?.abha_id}</p>
              </div>
            </div>
            <button className="nav-item" onClick={handleLogout} style={{ color: "#f87171" }}>
              <span className="nav-icon">🚪</span> Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === "overview" && (
            <>
              <div className="page-header">
                <h1>Welcome, {(profile?.full_name || user?.full_name || "").split(" ")[0]} 👋</h1>
                <p>Your health dashboard overview</p>
              </div>

              {/* Profile Card */}
              <div className="profile-card card">
                <div className="profile-avatar">{initials}</div>
                <div style={{ flex: 1 }}>
                  <div className="profile-info">
                    <h2>{profile?.full_name || user?.full_name}</h2>
                    <div className="profile-badges">
                      <span className="badge badge-blue">🆔 {profile?.abha_id || user?.abha_id}</span>
                      <span className="badge badge-green">✅ Verified</span>
                      {profile?.gender && <span className="badge badge-gray">{profile.gender}</span>}
                    </div>
                    <div className="profile-meta">
                      <span>📱 {profile?.mobile || "N/A"}</span>
                      <span>📧 {profile?.email || "N/A"}</span>
                      <span>🪪 {profile?.aadhaar_masked || "XXXX-XXXX-XXXX"}</span>
                      {profile?.state && <span>📍 {profile.state}</span>}
                      {profile?.date_of_birth && <span>🎂 {profile.date_of_birth}</span>}
                    </div>
                  </div>
                  <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowProfileModal(true)}>
                      👤 View Full Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="stats-grid">
                <div className="stat-card card clickable" onClick={() => setAnalyticView('records')}>
                  <div className="stat-icon blue">📋</div>
                  <div className="stat-info"><h3>{records.length}</h3><p>Total Records</p></div>
                </div>
                <div className="stat-card card clickable" onClick={() => setAnalyticView('hospitals')}>
                  <div className="stat-icon saffron">🏥</div>
                  <div className="stat-info"><h3>{uniqueHospitals.length}</h3><p>Hospitals Visited</p></div>
                </div>
                <div className="stat-card card clickable" onClick={() => setAnalyticView('prescriptions')}>
                  <div className="stat-icon green">💊</div>
                  <div className="stat-info"><h3>{totalMeds}</h3><p>Total Prescriptions</p></div>
                </div>
                <div className="stat-card card clickable" onClick={() => setAnalyticView('treatments')}>
                  <div className="stat-icon navy">⏳</div>
                  <div className="stat-info"><h3>{ongoingCount}</h3><p>Active Treatments</p></div>
                </div>
              </div>


              {/* Recent Records */}
              <div className="card" style={{ marginBottom: "24px" }}>
                  <div className="card-header">
                    <h3>🕐 Recent Records</h3>
                    <button className="btn btn-sm btn-outline" onClick={() => setActiveTab("records")}>View All</button>
                  </div>
                  <div className="card-body">
                    {sortedRecords.slice(0, 3).map((r, idx) => (
                      <div key={idx} className="clickable-record-row" style={{
                        padding: "10px 0",
                        borderBottom: idx < 2 ? "1px solid var(--border-light)" : "none",
                        cursor: "pointer"
                      }} onClick={() => { setActiveTab("records"); setExpandedId(r.record_id || idx); }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: "0.88rem" }}>{r.diagnosis}</p>
                            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                              {r.doctor_name} • {r.hospital_name}
                            </p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span className="badge badge-gray">{r.visit_date}</span>
                            <br />
                            <span className={`badge ${r.treatment_status === "Ongoing" ? "badge-saffron" :
                              r.treatment_status === "Follow-up Required" ? "badge-blue" : "badge-green"}`}
                              style={{ marginTop: "4px" }}>
                              {r.treatment_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {records.length === 0 && (
                      <div className="empty-state">
                        <span className="empty-icon">📂</span>
                        <h3>No records yet</h3>
                        <p>Upload your first medical document</p>
                      </div>
                    )}
                  </div>
                </div>

              {/* Family Members Summary */}
              <div className="card" style={{ marginBottom: "24px" }}>
                <div className="card-header">
                  <h3>👨‍👩‍👧‍👦 Family Members</h3>
                  <button className="btn btn-sm btn-outline" onClick={() => setActiveTab("family")}>Manage</button>
                </div>
                <div className="card-body">
                  {family.length > 0 ? (
                    <div className="family-grid">
                      {family.map((m, i) => (
                        <div key={i} className="family-card card clickable-record-row"
                             style={{ cursor: "pointer" }}
                             onClick={async () => {
                               setActiveTab("family");
                               setViewingFamilyMember(m);
                               try {
                                 const res = await api.getFamilyRecords(user.user_id, m.member_id);
                                 setFamilyRecordsList(res.records || []);
                               } catch (e) {
                                 console.error(e);
                                 setFamilyRecordsList([]);
                               }
                             }}>
                          <div className={`family-avatar ${m.gender === "Female" ? "female" : "male"}`}>
                            {m.gender === "Female" ? "👩" : "👨"}
                          </div>
                          <div className="family-info">
                            <h4>{m.full_name}</h4>
                            <p>{m.relation} • {m.abha_id}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                      No family members added yet. <button className="btn btn-sm btn-outline" style={{ marginLeft: "8px" }}
                        onClick={() => setActiveTab("family")}>Add Family Member</button>
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ═══ RECORDS TAB ═══ */}
          {activeTab === "records" && (
            <>
              <div className="page-header">
                <h1>📋 Medical Records</h1>
                <p>{records.length} record{records.length !== 1 ? "s" : ""} in your health history</p>
              </div>

              <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                <div className="input-group" style={{ flex: 1, minWidth: "250px" }}>
                  <input type="text" className="input-field"
                    placeholder="🔍 Search by diagnosis, doctor, hospital, or medicine..."
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="records-list">
                {filteredRecords.map((record, idx) => {
                  const isExpanded = expandedId === (record.record_id || idx);
                  return (
                    <div key={record.record_id || idx} className="record-card card">
                      <div className="record-card-header"
                        onClick={() => setExpandedId(isExpanded ? null : (record.record_id || idx))}>
                        <div className="record-title">
                          <h3>{record.diagnosis}</h3>
                          <p>{record.doctor_name}{record.doctor_registration ? ` (${record.doctor_registration})` : ""} • {record.hospital_name}</p>
                        </div>
                        <div className="record-badges">
                          <span className={`badge ${record.record_type?.includes("IPD") ? "badge-saffron" :
                            record.record_type?.includes("Lab") ? "badge-blue" : "badge-green"}`}>
                            {record.record_type || "OPD"}
                          </span>
                          <span className="badge badge-gray">{record.visit_date}</span>
                          <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="record-details">
                          {/* Dates */}
                          <div className="detail-grid">
                            <div className="detail-field">
                              <label>Visit Date</label>
                              <p>{record.visit_date}</p>
                            </div>
                            {record.admission_date && (
                              <div className="detail-field">
                                <label>Admission Date</label>
                                <p>{record.admission_date}</p>
                              </div>
                            )}
                            {record.discharge_date && (
                              <div className="detail-field">
                                <label>Discharge Date</label>
                                <p>{record.discharge_date}</p>
                              </div>
                            )}
                            <div className="detail-field">
                              <label>Treatment Status</label>
                              <p>
                                <span className={`badge ${record.treatment_status === "Ongoing" ? "badge-saffron" :
                                  record.treatment_status === "Follow-up Required" ? "badge-blue" : "badge-green"}`}>
                                  {record.treatment_status}
                                </span>
                              </p>
                            </div>
                            <div className="detail-field">
                              <label>Doctor</label>
                              <p>{record.doctor_name}</p>
                            </div>
                            <div className="detail-field">
                              <label>Hospital / Facility</label>
                              <p>{record.hospital_name}</p>
                            </div>
                          </div>

                          {/* Vitals */}
                          {record.vitals && Object.keys(record.vitals).length > 0 && (
                            <div style={{ marginTop: "16px" }}>
                              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                                Vitals at Visit
                              </label>
                              <div className="vitals-row">
                                {Object.entries(record.vitals).map(([k, v]) => (
                                  <div key={k} className="vital-chip">
                                    {k.toUpperCase()}: <strong>{v}</strong>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Medications Table */}
                          {record.medicines && record.medicines.length > 0 && (
                            <div style={{ marginTop: "16px" }}>
                              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                                💊 Prescribed Medications
                              </label>
                              <table className="drug-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Drug Name</th>
                                    <th>Dosage</th>
                                    <th>Frequency</th>
                                    <th>Duration</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {record.medicines.map((med, i) => (
                                    <tr key={i}>
                                      <td>{i + 1}</td>
                                      <td style={{ fontWeight: 500 }}>{typeof med === "string" ? med : med.name}</td>
                                      <td>{typeof med === "string" ? "-" : (med.dosage || "-")}</td>
                                      <td>{typeof med === "string" ? "-" : (med.frequency || "-")}</td>
                                      <td>{typeof med === "string" ? "-" : (med.duration || "-")}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Lab Results Table */}
                          {record.lab_results && record.lab_results.length > 0 && (
                            <div style={{ marginTop: "16px" }}>
                              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                                🧪 Lab Results / Investigations
                              </label>
                              <table className="lab-table">
                                <thead>
                                  <tr>
                                    <th>Test</th>
                                    <th>Value</th>
                                    <th>Reference</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {record.lab_results.map((lab, i) => (
                                    <tr key={i}>
                                      <td style={{ fontWeight: 500 }}>{lab.test}</td>
                                      <td>{lab.value}</td>
                                      <td>{lab.reference || "-"}</td>
                                      <td className={
                                        lab.status === "Normal" ? "status-normal" :
                                        lab.status === "Low" ? "status-low" : "status-abnormal"
                                      }>{lab.status}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Doctor Notes */}
                          {record.doctor_notes && (
                            <div style={{ marginTop: "16px" }}>
                              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                                📝 Doctor&apos;s Notes
                              </label>
                              <p style={{ fontSize: "0.88rem", marginTop: "6px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                                {record.doctor_notes}
                              </p>
                            </div>
                          )}

                          {/* File Info / Inline Upload */}
                          <div style={{ marginTop: "20px" }}>
                            {record.file_name ? (
                              <div style={{ padding: "12px", background: "var(--bg-light)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ fontSize: "1.5rem" }}>📄</span>
                                  <div>
                                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{record.file_name}</p>
                                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                      Attached: {new Date(record.uploaded_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                                    </p>
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <button className="btn btn-sm btn-outline"
                                    onClick={(e) => { e.stopPropagation(); handleViewReport(record); }}>
                                    👁️ View
                                  </button>
                                  {record.uploaded_at && (new Date() - new Date(record.uploaded_at)) < 24 * 60 * 60 * 1000 && (
                                    <button className="btn btn-sm btn-outline" style={{ borderColor: "var(--error)", color: "var(--error)" }}
                                      onClick={(e) => { e.stopPropagation(); handleDeleteReport(record); }}>
                                      🗑️ Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="card" style={{ border: "1px dashed var(--border-light)", boxShadow: "none" }}>
                                <div className="card-body" style={{ padding: "16px" }}>
                                  <h4 style={{ fontSize: "0.9rem", marginBottom: "12px" }}>Attach Medical Report</h4>
                                  
                                  {uploadError && uploadRecordId === record.record_id && (
                                    <div className="alert alert-error" style={{ marginBottom: "12px", padding: "8px", fontSize: "0.8rem" }}>
                                      <span>⚠️</span> {uploadError}
                                    </div>
                                  )}

                                  <div className={`upload-zone ${dragOverRecord === record.record_id ? "drag-over" : ""}`}
                                    style={{ padding: "16px", minHeight: "100px" }}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverRecord(record.record_id); }}
                                    onDragLeave={() => setDragOverRecord(null)}
                                    onDrop={(e) => { 
                                      e.preventDefault(); 
                                      setDragOverRecord(null); 
                                      if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0], record.record_id); 
                                    }}
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = '.pdf,.jpg,.jpeg,.png';
                                      input.onchange = (e) => { if (e.target.files[0]) handleFileSelect(e.target.files[0], record.record_id); };
                                      input.click();
                                    }}>
                                    
                                    {file && uploadRecordId === record.record_id ? (
                                      <div style={{ textAlign: "center" }}>
                                        <span style={{ fontSize: "1.5rem" }}>📄</span>
                                        <p style={{ fontWeight: 600, margin: "4px 0" }}>{file.name}</p>
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB</p>
                                        <button className="btn btn-sm btn-ghost" style={{ marginTop: "8px" }}
                                          onClick={(e) => { e.stopPropagation(); setFile(null); setUploadRecordId(null); setUploadError(""); }}>
                                          ✕ Remove
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ textAlign: "center" }}>
                                        <span style={{ fontSize: "1.5rem", opacity: 0.5 }}>☁️</span>
                                        <p style={{ fontSize: "0.85rem", margin: "4px 0" }}>Drag & Drop report here</p>
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>or click to browse</p>
                                      </div>
                                    )}
                                  </div>

                                  {file && uploadRecordId === record.record_id && (
                                    <button className="btn btn-primary btn-sm" style={{ width: "100%", marginTop: "12px" }}
                                      onClick={() => handleInlineUpload(record.record_id)} disabled={uploading}>
                                      {uploading ? <span className="spinner"></span> : "📤 Upload & Attach"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <div className="empty-state card">
                    <span className="empty-icon">🔍</span>
                    {search ? (
                      <>
                        <h3>No matching records</h3>
                        <button className="btn btn-sm btn-outline" style={{ marginTop: "8px" }}
                          onClick={() => setSearch("")}>Clear Search</button>
                      </>
                    ) : (
                      <>
                        <h3>No medical records yet</h3>
                        <p>Upload your first medical document</p>
                        <button className="btn btn-primary btn-sm" style={{ marginTop: "8px" }}
                          onClick={() => setActiveTab("upload")}>📤 Upload Document</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}



          {/* ═══ FAMILY TAB ═══ */}
          {activeTab === "family" && (
            <>
              <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h1>👨‍👩‍👧‍👦 Family Members</h1>
                  <p>Manage your family&apos;s health records under your ABHA account</p>
                </div>
                {!viewingFamilyMember && (
                  <button className="btn btn-primary" onClick={() => setShowFamilyModal(true)}>
                    ➕ Add Family Member
                  </button>
                )}
              </div>

              {viewingFamilyMember ? (
                <div>
                  <button className="btn btn-sm btn-ghost" style={{ marginBottom: "16px" }} onClick={() => setViewingFamilyMember(null)}>
                    ← Back to Family List
                  </button>
                  <div className="card" style={{ marginBottom: "20px", padding: "16px", background: "var(--bg-light)" }}>
                    <h3 style={{ margin: 0 }}>Showing medical records for <strong>{viewingFamilyMember.full_name}</strong></h3>
                  </div>
                  {familyRecordsList.length === 0 ? (
                    <div className="empty-state card">
                      <span className="empty-icon">📂</span>
                      <h3>No records available</h3>
                      <p>This family member doesn&apos;t have any medical records linked yet.</p>
                    </div>
                  ) : (
                    <div className="records-list">
                      {familyRecordsList.map((record, idx) => {
                        const isExpanded = expandedId === ("fam_" + (record.record_id || idx));
                        return (
                          <div key={idx} className="record-card card">
                            <div className="record-card-header"
                              onClick={() => setExpandedId(isExpanded ? null : ("fam_" + (record.record_id || idx)))}>
                              <div className="record-title">
                                <h3>{record.diagnosis}</h3>
                                <p>{record.doctor_name} • {record.hospital_name}</p>
                              </div>
                              <div className="record-badges">
                                <span className="badge badge-gray">{record.visit_date}</span>
                                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{isExpanded ? "▲" : "▼"}</span>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="record-details">
                                <div className="detail-grid">
                                  <div className="detail-field">
                                    <label>Visit Date</label>
                                    <p>{record.visit_date}</p>
                                  </div>
                                  <div className="detail-field">
                                    <label>Treatment Status</label>
                                    <p><span className="badge badge-blue">{record.treatment_status}</span></p>
                                  </div>
                                </div>
                                {/* Reduced detail view for family members for conciseness */}
                                {record.doctor_notes && (
                                  <div style={{ marginTop: "16px" }}>
                                    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>📝 Notes</label>
                                    <p style={{ fontSize: "0.88rem", marginTop: "6px" }}>{record.doctor_notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : family.length > 0 ? (
                <div className="family-grid">
                  {family.map((m, i) => (
                    <div key={i} className="card" style={{ padding: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
                        <div className={`family-avatar ${m.gender === "Female" ? "female" : "male"}`}>
                          {m.gender === "Female" ? "👩" : "👨"}
                        </div>
                        <div>
                          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{m.full_name}</h3>
                          <span className="badge badge-blue">{m.relation}</span>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem" }}>
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>ABHA ID</label>
                          <p style={{ fontWeight: 500, color: "var(--primary)" }}>{m.abha_id}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Gender</label>
                          <p>{m.gender}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Date of Birth</label>
                          <p>{m.date_of_birth || "N/A"}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Mobile</label>
                          <p>{m.mobile || "N/A"}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Aadhaar</label>
                          <p>{m.aadhaar_masked}</p>
                        </div>
                      </div>
                      <button className="btn btn-sm btn-outline" style={{ width: "100%", marginTop: "14px" }}
                        onClick={async () => {
                          setViewingFamilyMember(m);
                          try {
                            const res = await api.getFamilyRecords(user.user_id, m.member_id);
                            setFamilyRecordsList(res.records || []);
                          } catch (e) {
                            console.error(e);
                            setFamilyRecordsList([]);
                          }
                        }}>
                        📋 View Records
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state card">
                  <span className="empty-icon">👨‍👩‍👧‍👦</span>
                  <h3>No family members added</h3>
                  <p>Add family members to manage their health records under your account</p>
                  <button className="btn btn-primary" style={{ marginTop: "12px" }}
                    onClick={() => setShowFamilyModal(true)}>
                    ➕ Add Family Member
                  </button>
                </div>
              )}
            </>
          )}

          {/* ═══ UPLOAD TAB ═══ */}
          {activeTab === "upload" && (
            <>
              <div className="page-header">
                <h1>📤 Upload New Medical Report</h1>
                <p>Digitize your physical reports using our AI health pipeline</p>
              </div>

              <div className="card" style={{ padding: "40px" }}>
                {uploadProgress === -1 ? (
                  <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                    {newUploadError && (
                      <div className="alert alert-error" style={{ marginBottom: "20px" }}>
                        <span>⚠️</span> {newUploadError}
                      </div>
                    )}
                    
                    <div className="upload-zone" 
                      onClick={() => document.getElementById("new-upload-input").click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files[0]) setNewFile(e.dataTransfer.files[0]);
                      }}>
                      <input id="new-upload-input" type="file" hidden accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => { if (e.target.files[0]) setNewFile(e.target.files[0]); }} />
                      
                      {newFile ? (
                        <div>
                          <span className="upload-icon">📄</span>
                          <h3>{newFile.name}</h3>
                          <p>{(newFile.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze</p>
                          <button className="btn btn-sm btn-ghost" style={{ marginTop: "12px" }}
                            onClick={(e) => { e.stopPropagation(); setNewFile(null); }}>✕ Change File</button>
                        </div>
                      ) : (
                        <div>
                          <span className="upload-icon">☁️</span>
                          <h3>Click or Drag Report Here</h3>
                          <p>Supports PDF, JPG, and PNG (Max 10MB)</p>
                        </div>
                      )}
                    </div>

                    {newFile && (
                      <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "24px" }}
                        onClick={handleNewUpload}>
                        🚀 Start AI Analysis
                      </button>
                    )}

                    <div style={{ marginTop: "32px", padding: "20px", background: "var(--bg-primary)", borderRadius: "var(--radius-lg)" }}>
                      <h4 style={{ fontSize: "0.9rem", marginBottom: "12px" }}>💡 Pro Tip</h4>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                        Our AI pipeline extracts medicines, dates, and vitals automatically. For best results, ensure the text in the image is clear and not blurry.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", maxWidth: "500px", margin: "0 auto", padding: "40px 0" }}>
                    <div className="spinner-container" style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto 32px" }}>
                       <div className="spinner-lg" style={{ width: "120px", height: "120px", borderDataWidth: "6px" }}></div>
                       <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "2rem" }}>
                          {uploadProgress === 0 && "📂"}
                          {uploadProgress === 1 && "🔍"}
                          {uploadProgress === 2 && "🏗️"}
                          {uploadProgress === 3 && "🛡️"}
                          {uploadProgress === 4 && "✅"}
                       </div>
                    </div>

                    <h2 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>
                       {uploadProgress === 0 && "Uploading Document..."}
                       {uploadProgress === 1 && "Extracting Text (OCR)..."}
                       {uploadProgress === 2 && "Structuring Medical Data..."}
                       {uploadProgress === 3 && "Checking Privacy & PII..."}
                       {uploadProgress === 4 && "Analysis Complete!"}
                    </h2>
                    
                    <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
                       {uploadProgress < 4 ? "Please stay on this page. Our AI is parsing your medical history." : "Your record has been successfully digitized and added to your vault."}
                    </p>

                    <div className="processing-steps">
                       {stages.map((stage, i) => (
                         <div key={i} className={`processing-step ${uploadProgress > i ? "done" : uploadProgress === i ? "active" : ""}`}>
                           {uploadProgress > i ? "✓" : i + 1}. {stage.label}
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Family Member Modal */}
      {showFamilyModal && (
        <div className="modal-overlay" onClick={closeFamilyModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Link Family Member</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeFamilyModal}>✕</button>
            </div>
            <div className="modal-body">
              {familyError && (
                <div className="alert alert-error" style={{ marginBottom: "12px" }}>
                  <span>⚠️</span> {familyError}
                </div>
              )}

              {familyStep === 1 ? (
                <div className="auth-form">
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: "1.5" }}>
                    Enter your family member&apos;s Health ID to link their records. They will receive an OTP on their registered mobile number to approve the request.
                  </p>
                  <div className="input-group">
                    <label>Health ID (ABHA) <span className="required">*</span></label>
                    <input type="text" className="input-field" placeholder="XX-XXXX-XXXX-XXXX"
                      value={familyForm.abha_id}
                      onChange={(e) => setFamilyForm((p) => ({ ...p, abha_id: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label>Relation <span className="required">*</span></label>
                    <select className="input-field" value={familyForm.relation}
                      onChange={(e) => setFamilyForm((p) => ({ ...p, relation: e.target.value }))}>
                      <option value="">Select Relation</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Grandfather">Grandfather</option>
                      <option value="Grandmother">Grandmother</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="auth-form">
                  <div className="alert alert-info" style={{ marginBottom: "16px", fontSize: "0.85rem" }}>
                    <span>ℹ️</span>
                    <div>
                      <strong>OTP Sent Successfully</strong>
                      <p>An OTP has been sent to the mobile number ending in {familyOtpInfo.masked_mobile}</p>
                    </div>
                  </div>
                  {familyOtpInfo.demo_otp && (
                    <div style={{ fontSize: "0.8rem", color: "var(--primary)", marginBottom: "12px", padding: "8px", background: "#DBEAFE", borderRadius: "8px" }}>
                      Demo OTP: <strong>{familyOtpInfo.demo_otp}</strong>
                    </div>
                  )}
                  <div className="input-group">
                    <label>Enter 6-digit OTP <span className="required">*</span></label>
                    <input type="text" className="input-field" placeholder="000000" maxLength={6}
                      value={familyForm.otp}
                      onChange={(e) => setFamilyForm((p) => ({ ...p, otp: e.target.value.replace(/\D/g, "") }))} />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeFamilyModal}>Cancel</button>
              {familyStep === 1 ? (
                <button className="btn btn-primary" onClick={handleVerifyFamily} disabled={familyLoading}>
                  {familyLoading ? <span className="spinner"></span> : "Send OTP"}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleConfirmFamily} disabled={familyLoading}>
                  {familyLoading ? <span className="spinner"></span> : "Confirm & Link"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Details Modal */}
      {analyticView && (
        <div className="modal-overlay" onClick={() => { setAnalyticView(null); setAnalyticSearch(""); }}>
          <div className="modal" style={{ maxWidth: "650px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {analyticView === 'hospitals' && "🏥 Hospitals You've Visited"}
                {analyticView === 'prescriptions' && "💊 Medication Tracker (Ongoing)"}
                {analyticView === 'treatments' && "⏳ Your Active Treatments"}
                {analyticView === 'records' && "📋 All Medical Records"}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAnalyticView(null); setAnalyticSearch(""); }}>✕</button>
            </div>
            <div className="modal-body">
              {/* Search within analytics */}
              <div className="input-group" style={{ marginBottom: "20px" }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder={`Search ${analyticView}...`} 
                  value={analyticSearch}
                  onChange={(e) => setAnalyticSearch(e.target.value)}
                />
              </div>

              <div className="analytic-content-list" style={{ maxHeight: "450px", overflowY: "auto" }}>
                
                {/* 🏥 HOSPITALS VIEW */}
                {analyticView === 'hospitals' && uniqueHospitals
                  .filter(h => h.toLowerCase().includes(analyticSearch.toLowerCase()))
                  .map((hospital, idx) => (
                    <div key={idx} className="card" style={{ marginBottom: "12px", padding: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ margin: 0 }}>{hospital}</h4>
                        <span className="badge badge-gray">{records.filter(r => r.hospital_name === hospital).length} records</span>
                      </div>
                      <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {records.filter(r => r.hospital_name === hospital).map((r, ridx) => (
                          <button 
                            key={ridx} 
                            className="btn btn-sm btn-outline" 
                            style={{ fontSize: "0.75rem" }}
                            onClick={() => {
                              setAnalyticView(null);
                              setActiveTab("records");
                              setExpandedId(r.record_id);
                              // Scroll would be nice but simple tab switch for now
                            }}
                          >
                            📄 {r.diagnosis} ({r.visit_date})
                          </button>
                        ))}
                      </div>
                    </div>
                ))}

                {/* 💊 PRESCRIPTIONS VIEW */}
                {analyticView === 'prescriptions' && (
                  ongoingRecords.length > 0 ? (
                    ongoingRecords.map((record, ridx) => (
                      <div key={ridx} className="card" style={{ marginBottom: "16px", padding: "16px", borderLeft: "4px solid var(--success)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                          <h4 style={{ margin: 0, color: "var(--primary)" }}>{record.diagnosis}</h4>
                          <span className="badge badge-green">{record.visit_date}</span>
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "12px" }}>Doctor: {record.doctor_name}</p>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {(record.medicines || []).map((med, midx) => {
                            const medName = typeof med === "string" ? med : med.name;
                            const medKey = `${record.record_id}-${midx}`;
                            const isTaken = medsTrack[medKey];
                            return (
                              <div key={midx} className="med-tracking-row" style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "12px", 
                                padding: "10px", 
                                background: isTaken ? "var(--success-bg)" : "var(--bg-primary)",
                                borderRadius: "8px",
                                transition: "all 0.2s"
                              }}>
                                <input 
                                  type="checkbox" 
                                  id={medKey}
                                  checked={!!isTaken}
                                  onChange={() => toggleMedTrack(medKey, medName)}
                                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                />
                                <label htmlFor={medKey} style={{ flex: 1, cursor: "pointer", fontWeight: 600, color: isTaken ? "var(--success)" : "var(--text-primary)" }}>
                                  {medName}
                                  {med.dosage && <span style={{ fontWeight: 400, marginLeft: "8px", fontSize: "0.8rem", opacity: 0.7 }}>({med.dosage})</span>}
                                </label>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{isTaken ? "✅ Taken Today" : "⏳ Pending"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p>No ongoing prescriptions found. Check your health history.</p>
                    </div>
                  )
                )}

                {/* ⏳ TREATMENTS VIEW */}
                {analyticView === 'treatments' && (
                  ongoingRecords.map((r, idx) => (
                    <div 
                      key={idx} 
                      className="card clickable-record-row" 
                      style={{ marginBottom: "12px", padding: "16px", cursor: "pointer" }}
                      onClick={() => { setAnalyticView(null); setActiveTab("records"); setExpandedId(r.record_id); }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{r.diagnosis}</h4>
                          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{r.hospital_name} • {r.doctor_name}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className={`badge ${r.treatment_status === "Ongoing" ? "badge-saffron" : "badge-blue"}`}>{r.treatment_status}</span>
                          <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>Started: {r.visit_date}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* RECORDS QUICK VIEW */}
                {analyticView === 'records' && records.map((r, idx) => (
                  <div 
                    key={idx} 
                    className="card clickable-record-row" 
                    style={{ marginBottom: "12px", padding: "16px", cursor: "pointer" }}
                    onClick={() => { setAnalyticView(null); setActiveTab("records"); setExpandedId(r.record_id); }}
                  >
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: 0 }}>{r.diagnosis}</h4>
                        <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{r.visit_date} • {r.hospital_name}</p>
                      </div>
                      <span className="badge badge-gray">{r.record_type}</span>
                    </div>
                  </div>
                ))}

                {/* NEW UPLOAD VIEW (AI Pipeline) */}
                {analyticView === 'upload_new' && (
                  <div style={{ padding: "20px" }}>
                    {uploadProgress === -1 ? (
                      <div className="upload-zone" 
                        onClick={() => document.getElementById("analytics-upload-btn").click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files[0]) setNewFile(e.dataTransfer.files[0]);
                        }}>
                        <input id="analytics-upload-btn" type="file" hidden accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => { if (e.target.files[0]) setNewFile(e.target.files[0]); }} />
                        
                        {newFile ? (
                          <div>
                            <span className="upload-icon">📄</span>
                            <h3>{newFile.name}</h3>
                            <button className="btn btn-primary" style={{ marginTop: "12px" }} onClick={(e) => { e.stopPropagation(); handleNewUpload(); }}>🚀 Start Analysis</button>
                          </div>
                        ) : (
                          <div>
                            <span className="upload-icon">☁️</span>
                            <h3>Click or Drag Report</h3>
                            <p>Supports PDF, JPG, PNG</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <div className="spinner-lg" style={{ margin: "0 auto 20px" }}></div>
                        <h3>{stages[uploadProgress]?.label || "Processing..."}</h3>
                        <p>{stages[uploadProgress]?.desc}</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setAnalyticView(null); setAnalyticSearch(""); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Details Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 Citizen Profile Details</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: "0" }}>
              <div style={{ padding: "24px", background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "white", textAlign: "center" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "2rem", fontWeight: 800, border: "3px solid white" }}>
                  <span style={{ margin: "auto" }}>{initials}</span>
                </div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>{profile?.full_name || user?.full_name}</h2>
                <p style={{ opacity: 0.9, fontSize: "0.95rem" }}>Health ID: {profile?.abha_id || user?.abha_id}</p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "12px" }}>
                   <span className="badge" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid white" }}>Verified ABHA</span>
                   <span className="badge" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid white" }}>NDHM Compliant</span>
                </div>
              </div>
              
              <div style={{ padding: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="detail-field">
                    <label>Full Name</label>
                    <p>{profile?.full_name || user?.full_name}</p>
                  </div>
                  <div className="detail-field">
                    <label>ABHA Address</label>
                    <p style={{ color: "var(--primary)" }}>{profile?.abha_address || user?.abha_address || "N/A"}</p>
                  </div>
                  <div className="detail-field">
                    <label>Mobile Number</label>
                    <p>{profile?.mobile || "N/A"}</p>
                  </div>
                  <div className="detail-field">
                    <label>Email ID</label>
                    <p>{profile?.email || "N/A"}</p>
                  </div>
                  <div className="detail-field">
                    <label>Date of Birth</label>
                    <p>{profile?.date_of_birth || "N/A"}</p>
                  </div>
                  <div className="detail-field">
                    <label>Gender</label>
                    <p>{profile?.gender || "N/A"}</p>
                  </div>
                  <div className="detail-field">
                    <label>Aadhaar Number</label>
                    <p>{profile?.aadhaar_masked || "XXXX-XXXX-XXXX"}</p>
                  </div>
                  <div className="detail-field">
                    <label>Account Status</label>
                    <p><span className="badge badge-green">Active</span></p>
                  </div>
                </div>

                <div className="detail-field" style={{ marginTop: "20px", padding: "16px", background: "var(--bg-primary)", borderRadius: "var(--radius-md)" }}>
                  <label>Current Address</label>
                  <p style={{ fontSize: "0.9rem", marginTop: "4px" }}>
                    {profile?.address ? `${profile.address}, ` : ""}
                    {profile?.district ? `${profile.district}, ` : ""}
                    {profile?.state || "N/A"}
                  </p>
                </div>

                {/* QR Code Section */}
                <div style={{ marginTop: "24px", padding: "24px", background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)", borderRadius: "var(--radius-lg)", textAlign: "center", border: "1px solid #bae6fd" }}>
                  <h4 style={{ marginBottom: "16px", color: "#0369a1", fontSize: "1rem" }}>📱 Health ID QR Code</h4>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "16px" }}>
                    Show this QR code at hospitals for quick identification
                  </p>
                  <div style={{ 
                    background: "white", 
                    padding: "16px", 
                    borderRadius: "12px", 
                    display: "inline-block",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={api.getQRCodeUrl(profile?.abha_id || user?.abha_id)} 
                      alt="Health ID QR Code" 
                      style={{ width: "180px", height: "180px" }}
                    />
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0369a1" }}>
                      {profile?.abha_id || user?.abha_id}
                    </p>
                  </div>
                  <div style={{ marginTop: "16px" }}>
                    <a 
                      href={api.getQRCodeUrl(profile?.abha_id || user?.abha_id)}
                      download={`qr-${profile?.abha_id || user?.abha_id}.png`}
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: "none" }}
                    >
                      ⬇️ Download QR Code
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowProfileModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setShowProfileModal(false); alert("Profile editing is disabled in demo mode."); }}>Edit Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {showDocModal && (
        <div className="modal-overlay" onClick={() => setShowDocModal(false)}>
          <div className="modal" style={{ maxWidth: "800px", width: "95%", height: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 {docTitle}</h2>
              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn btn-outline btn-sm"
                  onClick={() => {
                    // Try to print the iframe content directly. If it fails due to SOP (e.g., cross-origin or local network restrictions), fallback to window.print() or downloading the file.
                    try {
                      const iframe = document.getElementById("pdf-viewer-frame");
                      if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.print();
                      } else {
                        window.open(docUrl, "_blank");
                      }
                    } catch (e) {
                      window.open(docUrl, "_blank"); // Fallback: open in new tab and let user print from there
                    }
                  }}>
                  🖨️ Print Document
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDocModal(false)}>✕</button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0, overflow: "hidden" }}>
              <iframe
                id="pdf-viewer-frame"
                src={`${docUrl}#view=FitH`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Medical Report PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
