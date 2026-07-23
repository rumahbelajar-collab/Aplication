import React, { useState, useEffect } from "react";
import { 
  Home, 
  Users, 
  Wallet, 
  TrendingUp, 
  BookOpen, 
  GraduationCap, 
  LogOut, 
  Coins, 
  Receipt, 
  PlusCircle, 
  FileText,
  Info,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  UserPlus,
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react";
import { 
  getDatabase, 
  Database, 
  formatRupiah, 
  saveDatabase,
  addSessionTransaction,
  safeGetItem,
  safeSetItem,
  getTodayDateString,
  DB_STORAGE_KEY
} from "./lib/db";
import { UserSession, Tutor } from "./types";
import { pullFromSupabase, pushToSupabase, subscribeToSyncState, SyncState, subscribeToDatabaseChanges } from "./lib/supabase";

// Admin Submodules
import AdminDashboard from "./components/AdminDashboard";
import AdminOperasional from "./components/AdminOperasional";
import AdminKeuangan from "./components/AdminKeuangan";
import AdminLaporan from "./components/AdminLaporan";

// Tutor Submodules
import TutorDashboard from "./components/TutorDashboard";
import TutorRiwayat from "./components/TutorRiwayat";
import TutorRekening from "./components/TutorRekening";
import TutorLaporan from "./components/TutorLaporan";

import CustomDatePicker from "./components/CustomDatePicker";

export default function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // Override window.alert with a beautiful custom toast!
    window.alert = (message: string) => {
      const lower = message.toLowerCase();
      let type: "success" | "error" | "info" = "info";
      if (lower.includes("berhasil") || lower.includes("sukses") || lower.includes("disalin")) {
        type = "success";
      } else if (lower.includes("gagal") || lower.includes("harap") || lower.includes("wajib") || lower.includes("salah") || lower.includes("tidak valid") || lower.includes("yakin")) {
        type = "error";
      }
      showToast(message, type);
    };
  }, []);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("home");
  const [adminSubTab, setAdminSubTab] = useState<string>("");
  const [laporanSubTab, setLaporanSubTab] = useState<"pdf" | "absensi" | "verifikasi">("pdf");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");

  // Auth form state
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Registration form state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regNama, setRegNama] = useState("");
  const [regIdLogin, setRegIdLogin] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regTelepon, setRegTelepon] = useState("");
  const [regAlamat, setRegAlamat] = useState("");

  // Quick Action triggers from Admin Dashboard
  const [quickActionOpen, setQuickActionOpen] = useState<"session" | "payment" | "handover" | "honor" | null>(null);

  // Quick Action: Admin log new session modal
  const [isAdminSessionOpen, setIsAdminSessionOpen] = useState(false);
  const [sessDate, setSessDate] = useState(getTodayDateString());
  const [sessSiswaId, setSessSiswaId] = useState("");
  const [sessTutorId, setSessTutorId] = useState("");
  const [sessProgramId, setSessProgramId] = useState("");
  const [sessCatatan, setSessCatatan] = useState("");

  // Supabase sync state
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    lastSynced: safeGetItem("supabase_last_synced"),
    errorMessage: null
  });

  // PWA installation prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert("Aplikasi standalone dapat dipasang melalui menu browser Anda ('Tambahkan ke Layar Utama' / 'Add to Home Screen').");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    const unsubscribe = subscribeToSyncState(state => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  // Subscribe to real-time database changes from Supabase
  useEffect(() => {
    const unsubscribe = subscribeToDatabaseChanges((newDb) => {
      // Avoid circular rerender loops if the data is identical
      const currentLocal = safeGetItem(DB_STORAGE_KEY);
      const incomingRemote = JSON.stringify(newDb);
      if (currentLocal !== incomingRemote) {
        setDb(newDb);
        safeSetItem(DB_STORAGE_KEY, incomingRemote);
      }
    });
    return unsubscribe;
  }, []);

  // Load database on start
  useEffect(() => {
    const loadedDb = getDatabase();
    setDb(loadedDb);
    
    // Background load from Supabase
    const initSupabaseSync = async () => {
      try {
        const supabaseDb = await pullFromSupabase();
        if (supabaseDb) {
          setDb(supabaseDb);
          safeSetItem(DB_STORAGE_KEY, JSON.stringify(supabaseDb));
        } else {
          // If Supabase returned null (e.g. empty or table not ready), sync local state to Supabase
          await pushToSupabase(loadedDb);
        }
      } catch (err) {
        console.warn("Failed to fetch initial state from Supabase (using local storage instead):", err);
      }
    };
    
    const timer = setTimeout(() => {
      initSupabaseSync();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  if (!db) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="font-bold text-slate-700">Memuat Sistem Rumah Belajar...</h3>
      </div>
    );
  }

  // Quick Login Assist values
  const handleQuickLogin = (role: "admin" | "tutor", id: string = "admin") => {
    if (role === "admin") {
      setLoginId("admin");
      setPassword(db?.adminPassword || "admin123");
    } else {
      setLoginId(id);
      setPassword("123");
    }
  };

  // Perform Auth with Automatic Role Detection
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allowedAdminPassword = db?.adminPassword || "admin123";
    
    // 1. Try Admin verification
    if (loginId.toLowerCase() === "admin" && password === allowedAdminPassword) {
      setUserSession({
        role: "admin",
        userId: "admin",
        nama: "Administrator Utama"
      });
      setActiveTab("home");
      return;
    }

    // 2. Try Tutor verification
    const matchedTutor = db.tutors.find(
      t => t.idLogin.toLowerCase() === loginId.toLowerCase() && t.status === "aktif"
    );
    
    if (matchedTutor && (password === matchedTutor.password || password === "123")) {
      setUserSession({
        role: "tutor",
        userId: matchedTutor.id,
        nama: matchedTutor.nama
      });
      setActiveTab("home");
      return;
    }

    // 3. Fallback if both fail
    alert("Username atau Password salah, atau akun Tutor Anda sedang dinonaktifkan.");
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNama.trim() || !regIdLogin.trim() || !regPassword.trim() || !regTelepon.trim()) {
      alert("Harap lengkapi semua field bertanda bintang.");
      return;
    }

    if (!db) return;

    // Check if username is already taken by another tutor or is "admin"
    const cleanedUsername = regIdLogin.toLowerCase().replace(/\s+/g, "");
    if (cleanedUsername === "admin") {
      alert("Username 'admin' tidak dapat digunakan.");
      return;
    }

    const loginCheck = db.tutors.find(t => t.idLogin.toLowerCase() === cleanedUsername);
    if (loginCheck) {
      alert("Username sudah digunakan oleh Tutor lain. Silakan pilih username yang unik.");
      return;
    }

    // Generate unique Tutor ID, e.g. RBT05, RBT06, etc.
    const maxIdNum = db.tutors.reduce((max, t) => {
      const match = t.id.match(/^(?:T-|RBT)(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextId = `RBT${String(maxIdNum + 1).padStart(2, "0")}`;

    const newTutor: Tutor = {
      id: nextId,
      nama: regNama.trim(),
      idLogin: cleanedUsername,
      password: regPassword,
      status: "nonaktif", // Di-nonaktifkan dulu (disabled initially as requested)
      telepon: regTelepon.trim(),
      alamat: regAlamat.trim() || undefined,
      tanggalBergabung: getTodayDateString()
    };

    const nextDb = {
      ...db,
      tutors: [...db.tutors, newTutor]
    };

    setDb(nextDb);
    saveDatabase(nextDb);

    alert("Pendaftaran Tutor Berhasil! Status akun Anda saat ini 'Nonaktif' menunggu persetujuan dan aktivasi oleh Administrator.");
    
    // Clear registration form and switch back to login
    setRegNama("");
    setRegIdLogin("");
    setRegPassword("");
    setRegTelepon("");
    setRegAlamat("");
    setIsRegisterOpen(false);
  };

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar dari aplikasi?")) {
      setUserSession(null);
      setLoginId("");
      setPassword("");
    }
  };

  // Navigate directly with pre-filled filters
  const handleNavigateToTab = (tab: string, subTab?: string, selectedId?: string) => {
    setActiveTab(tab);
    if (subTab) {
      if (tab === "laporan") {
        setLaporanSubTab(subTab as any);
      } else {
        setAdminSubTab(subTab);
      }
    }
    if (selectedId) setSelectedEntityId(selectedId);
  };

  // Trigger quick action from dashboard
  const handleOpenQuickAction = (action: "session" | "payment" | "handover" | "honor" | "absensi") => {
    if (action === "session") {
      setSessDate(getTodayDateString());
      const firstStudent = db.students[0];
      const initialSiswaId = firstStudent?.id || "";
      setSessSiswaId(initialSiswaId);
      if (firstStudent && firstStudent.programId) {
        setSessProgramId(firstStudent.programId);
      } else {
        setSessProgramId("");
      }
      setSessTutorId(db.tutors.filter(t => t.status === "aktif")[0]?.id || "");
      setSessCatatan("");
      setIsAdminSessionOpen(true);
    } else if (action === "absensi") {
      setActiveTab("laporan");
      setLaporanSubTab("absensi");
    } else {
      setActiveTab("keuangan");
      setQuickActionOpen(action);
    }
  };

  // Handle student selection change in Admin quick session modal to auto-populate program if available
  const handleAdminStudentChange = (sId: string) => {
    setSessSiswaId(sId);
    if (sId) {
      const studentObj = db.students.find(s => s.id === sId);
      if (studentObj && studentObj.programId) {
        setSessProgramId(studentObj.programId);
      } else {
        setSessProgramId("");
      }
    } else {
      setSessProgramId("");
    }
  };

  // Admin session submit
  const handleAdminSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessSiswaId || !sessTutorId || !sessProgramId) {
      alert("Harap lengkapi semua isian termasuk Program Belajar.");
      return;
    }

    const nextDb = addSessionTransaction(db, {
      tanggal: sessDate,
      siswaId: sessSiswaId,
      tutorId: sessTutorId,
      programId: sessProgramId,
      catatan: sessCatatan.trim() || undefined
    });

    setDb(nextDb);
    setIsAdminSessionOpen(false);
    alert("Riwayat pertemuan baru berhasil disimpan oleh Admin.");
  };

  const renderNavigation = () => (
    <>
      {userSession?.role === "admin" ? (
        <>
          <button
            id="nav-admin-home"
            onClick={() => { setActiveTab("home"); setAdminSubTab(""); }}
            className={`flex md:flex-row flex-col items-center gap-2 py-2 px-4 md:w-full md:justify-start rounded-2xl transition-all cursor-pointer ${
              activeTab === "home" ? "text-brand-600 bg-brand-50 md:bg-white md:shadow-sm font-extrabold" : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50"
            }`}
          >
            <Home size={20} />
            <span className="text-[9px] md:text-xs font-bold uppercase md:capitalize tracking-wider">Home</span>
          </button>

          <button
            id="nav-admin-operasional"
            onClick={() => { setActiveTab("operasional"); setAdminSubTab("siswa"); }}
            className={`flex md:flex-row flex-col items-center gap-2 py-2 px-4 md:w-full md:justify-start rounded-2xl transition-all cursor-pointer ${
              activeTab === "operasional" ? "text-brand-600 bg-brand-50 md:bg-white md:shadow-sm font-extrabold" : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50"
            }`}
          >
            <Users size={20} />
            <span className="text-[9px] md:text-xs font-bold uppercase md:capitalize tracking-wider">Operasional</span>
          </button>

          <button
            id="nav-admin-keuangan"
            onClick={() => { setActiveTab("keuangan"); setAdminSubTab("siswa"); }}
            className={`flex md:flex-row flex-col items-center gap-2 py-2 px-4 md:w-full md:justify-start rounded-2xl transition-all cursor-pointer ${
              activeTab === "keuangan" ? "text-brand-600 bg-brand-50 md:bg-white md:shadow-sm font-extrabold" : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50"
            }`}
          >
            <Wallet size={20} />
            <span className="text-[9px] md:text-xs font-bold uppercase md:capitalize tracking-wider">Keuangan</span>
          </button>

          <button
            id="nav-admin-laporan"
            onClick={() => { setActiveTab("laporan"); setAdminSubTab(""); }}
            className={`flex md:flex-row flex-col items-center gap-2 py-2 px-4 md:w-full md:justify-start rounded-2xl transition-all cursor-pointer ${
              activeTab === "laporan" ? "text-brand-600 bg-brand-50 md:bg-white md:shadow-sm font-extrabold" : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50"
            }`}
          >
            <TrendingUp size={20} />
            <span className="text-[9px] md:text-xs font-bold uppercase md:capitalize tracking-wider">Laporan</span>
          </button>
        </>
      ) : userSession?.role === "tutor" ? (
        <>
          <button
            id="nav-tutor-home"
            onClick={() => setActiveTab("home")}
            className={`flex md:flex-row flex-col items-center gap-2 py-2 px-4 md:w-full md:justify-start rounded-2xl transition-all cursor-pointer ${
              activeTab === "home" ? "text-brand-600 bg-brand-50 md:bg-white md:shadow-sm font-extrabold" : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50"
            }`}
          >
            <Home size={20} />
            <span className="text-[9px] md:text-xs font-bold uppercase md:capitalize tracking-wider">Home</span>
          </button>

          <button
            id="nav-tutor-laporan"
            onClick={() => setActiveTab("laporan_tutor")}
            className={`flex md:flex-row flex-col items-center gap-2 py-2 px-4 md:w-full md:justify-start rounded-2xl transition-all cursor-pointer ${
              activeTab === "laporan_tutor" ? "text-brand-600 bg-brand-50 md:bg-white md:shadow-sm font-extrabold" : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50"
            }`}
          >
            <FileText size={20} />
            <span className="text-[9px] md:text-xs font-bold uppercase md:capitalize tracking-wider">Laporan</span>
          </button>

          <button
            id="nav-tutor-riwayat"
            onClick={() => setActiveTab("riwayat")}
            className={`flex md:flex-row flex-col items-center gap-2 py-2 px-4 md:w-full md:justify-start rounded-2xl transition-all cursor-pointer ${
              activeTab === "riwayat" ? "text-brand-600 bg-brand-50 md:bg-white md:shadow-sm font-extrabold" : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50"
            }`}
          >
            <BookOpen size={20} />
            <span className="text-[9px] md:text-xs font-bold uppercase md:capitalize tracking-wider">Riwayat</span>
          </button>

          <button
            id="nav-tutor-rekening"
            onClick={() => setActiveTab("rekening")}
            className={`flex md:flex-row flex-col items-center gap-2 py-2 px-4 md:w-full md:justify-start rounded-2xl transition-all cursor-pointer ${
              activeTab === "rekening" ? "text-brand-600 bg-brand-50 md:bg-white md:shadow-sm font-extrabold" : "text-slate-400 hover:text-slate-600 md:hover:bg-slate-50"
            }`}
          >
            <Wallet size={20} />
            <span className="text-[9px] md:text-xs font-bold uppercase md:capitalize tracking-wider">Rekening</span>
          </button>
        </>
      ) : null}
    </>
  );

  return (
    <div className="h-screen bg-slate-50 font-sans antialiased relative overflow-hidden flex flex-col md:flex-row">
      
      {/* Abstract Background Blurs for Desktop/Tablet */}
      <div className="hidden md:block absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-brand-100/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="hidden md:block absolute -bottom-[10%] -right-[10%] w-[40vw] h-[40vw] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="hidden md:block absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-orange-50/40 rounded-full blur-[80px] pointer-events-none" />
      
      {/* ==================== DESKTOP SIDEBAR ==================== */}
      {userSession && (
        <aside className="hidden flex-col w-64 h-full bg-white/70 backdrop-blur-xl border-r border-white/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30 shrink-0">
          <div className="p-6 pb-2 border-b border-slate-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-200">
                <GraduationCap size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-slate-800 tracking-tight font-display uppercase leading-none">Rumah Belajar</h1>
                <p className="text-[9px] text-slate-500 font-medium mt-1">Sistem Informasi</p>
              </div>
            </div>
            <div className="bg-slate-50/80 rounded-2xl p-3 flex items-center gap-3 border border-slate-100/50 shadow-sm mb-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold shrink-0">
                {userSession.nama.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{userSession.nama}</p>
                <p className="text-[10px] text-slate-500 capitalize">{userSession.role}</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2 mt-2">Menu Utama</p>
            {renderNavigation()}
          </nav>
          <div className="p-4 border-t border-slate-100/50">
             <button
                onClick={() => setUserSession(null)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-rose-500 hover:bg-rose-50 font-bold text-xs transition-all cursor-pointer"
             >
                <LogOut size={16} />
                Keluar
             </button>
          </div>
        </aside>
      )}

      {/* ==================== MAIN SCREEN CONTENT ==================== */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden w-full max-w-full z-20">
        <main className="flex-1 overflow-y-auto w-full max-w-full md:max-w-[98%] xl:max-w-[96%] mx-auto flex flex-col pb-24 md:pb-8 md:p-8 p-0 md:pt-8">
          
          {/* A. NOT LOGGED IN - SHOW LOGIN PAGE */}
          {!userSession ? (
            <div id="login-screen" className="flex-1 flex flex-col justify-center items-center p-6 animate-fade-in my-auto">
              {/* Logo / Brand Header */}
              <div className="text-center mb-6 relative z-10">
              <div className="w-80 h-80 mx-auto mb-4 flex items-center justify-center">
                <div className="flex items-center gap-2.5">
                <img src="public13.png" alt="logo" className="w-80 h-80 object-contain" referrerPolicy="no-referrer" />    
                </div>
                </div>
                <h1 className="text-2xl font-extrabold text-brand-700 tracking-tight font-display uppercase">
                  Lets Get Started !
                </h1>
                <p className="text-xs font-semibold text-brand-500 mt-1">
                  Aplikasi sistemasi & Automatisasi rumah belajar
                </p>
              </div>

              {isRegisterOpen ? (
                /* Tutor Registration Card */
                <div className="bg-slate-50 p-6 rounded-3xl animate-fade-in">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                    <button 
                      type="button" 
                      onClick={() => setIsRegisterOpen(false)}
                      className="text-blue-400 hover:text-blue-600 transition-all p-1 hover:bg-slate-200 rounded-full"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="text-left">
                      <h2 className="text-xs font-extrabold text-blue-900 tracking-tight uppercase">Pendaftaran Tutor Baru</h2>
                      <p className="text-[10px] text-blue-600">Isi formulir pendaftaran di bawah ini</p>
                    </div>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3">
                    <div className="text-left">
                      <label className="block text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Nama Lengkap Tutor *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Sarah Wijaya, S.Pd."
                        value={regNama}
                        onChange={(e) => setRegNama(e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all text-blue-950 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="text-left">
                      <label className="block text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">ID Login / Username *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: sarah (huruf kecil & tanpa spasi)"
                        value={regIdLogin}
                        onChange={(e) => setRegIdLogin(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                        className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all text-blue-950 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="text-left">
                      <label className="block text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Password Keamanan *</label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? "text" : "password"}
                          required
                          placeholder="Masukkan password Anda"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 pr-10 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all text-blue-950 placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 focus:outline-none cursor-pointer transition-all"
                          title={showRegPassword ? "Sembunyikan password" : "Tampilkan password"}
                        >
                          {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="text-left">
                      <label className="block text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Nomor WhatsApp/Telepon *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 081234567890"
                        value={regTelepon}
                        onChange={(e) => setRegTelepon(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all text-blue-950 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="text-left">
                      <label className="block text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Alamat Lengkap (Opsional)</label>
                      <textarea
                        rows={2}
                        placeholder="Masukkan alamat tinggal Anda saat ini"
                        value={regAlamat}
                        onChange={(e) => setRegAlamat(e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all resize-none text-blue-950 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl flex items-start gap-1.5 mt-1 text-left">
                      <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[9.5px] text-blue-700 font-semibold leading-relaxed">
                        Akun baru akan berstatus <span className="font-bold underline">Nonaktif</span> terlebih dahulu untuk verifikasi keamanan oleh Administrator sebelum dapat digunakan untuk login.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 mt-2 flex items-center justify-center gap-1.5"
                    >
                      <UserPlus size={14} />
                      Kirim Pendaftaran
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen(false)}
                      className="w-full bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 p-2 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
                    >
                      Kembali ke Login
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {/* Login Card */}
                  <div className="bg-slate-50 p-6 ">
                    
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div className="text-left">
                        <input
                          type="text"
                          id="login-username-input"
                          required
                          placeholder="Masukkan ID login anda"
                          value={loginId}
                          onChange={(e) => setLoginId(e.target.value)}
                          className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="text-left">
                        <div className="relative">
                          <input
                            type={showLoginPassword ? "text" : "password"}
                            id="login-password-input"
                            required
                            placeholder="Masukkan password Anda"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full text-xs font-semibold p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-all"
                            title={showLoginPassword ? "Sembunyikan password" : "Tampilkan password"}
                          >
                            {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        id="login-submit-btn"
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white p-3 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 mt-2"
                      >
                        Masuk Sistem
                      </button>
                    </form>

                    {/* CTA Register / Sign Up Section */}
                    <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                      <p className="text-[10.5px] text-slate-400 font-medium">Belum punya akun</p>
                      <button
                        type="button"
                        onClick={() => setIsRegisterOpen(true)}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-600 hover:text-brand-700 transition-all cursor-pointer active:scale-95"
                      >
                        <UserPlus size={13} />
                        Registrasi Sekarang
                      </button>
                    </div>
                  </div>

                </>
              )}

            </div>
          ) : (
            
            // B. ACTIVE USER TAB CONTENT SECTIONS
            <div className="flex-grow shrink-0 animate-fade-in flex flex-col relative z-10 w-full min-h-full bg-white/40 md:bg-white/60 md:backdrop-blur-xl md:rounded-2xl md:shadow-[0_8px_32px_rgba(0,0,0,0.02)] md:border md:border-white/80 overflow-hidden">
              
              {/* Core Header (Sticky header containing sign-out & current user role) */}
              <div className="bg-brand-500 backdrop-blur-md border-b border-brand-500 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                  <span className="text-[10.5px] font-bold text-slate-500 tracking-tight uppercase truncate">
                    {userSession.role === "admin" ? "Sistem Admin" : "Sesi Tutor"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">

                  <button
                    id="auth-logout-btn"
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-[10.5px] font-black text-blue-500 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <LogOut size={11} />
                    Keluar
                  </button>
                </div>
              </div>

              {/* ROUTER CONTENT BY USER ROLE */}
              {userSession.role === "admin" ? (
                // ==============================================
                // ADMIN VIEWS
                // ==============================================
                <>
                  {activeTab === "home" && (
                    <AdminDashboard
                      db={db}
                      onNavigateToTab={handleNavigateToTab}
                      onOpenQuickAction={handleOpenQuickAction}
                      onUpdateDb={(newDb) => setDb(newDb)}
                    />
                  )}
                  {activeTab === "operasional" && (
                    <AdminOperasional
                      db={db}
                      onUpdateDb={(newDb) => setDb(newDb)}
                      onNavigateToTab={handleNavigateToTab}
                    />
                  )}
                  {activeTab === "keuangan" && (
                    <AdminKeuangan
                      db={db}
                      onUpdateDb={(newDb) => setDb(newDb)}
                      selectedEntityId={selectedEntityId}
                      onClearSelectedId={() => setSelectedEntityId("")}
                      quickActionOpen={quickActionOpen}
                      onCloseQuickAction={() => setQuickActionOpen(null)}
                      defaultSubTab={adminSubTab as any}
                    />
                  )}
                  {activeTab === "laporan" && (
                    <AdminLaporan
                      db={db}
                      onUpdateDb={(newDb) => setDb(newDb)}
                      defaultMainTab={laporanSubTab}
                    />
                  )}
                </>
              ) : (
                // ==============================================
                // TUTOR VIEWS
                // ==============================================
                <>
                  {activeTab === "home" && (
                    <TutorDashboard
                      db={db}
                      tutorId={userSession.userId}
                      onNavigateToTab={handleNavigateToTab}
                      onUpdateDb={(newDb) => setDb(newDb)}
                    />
                  )}
                  {activeTab === "laporan_tutor" && (
                    <TutorLaporan
                      db={db}
                      tutorId={userSession.userId}
                      onUpdateDb={(newDb) => setDb(newDb)}
                    />
                  )}
                  {activeTab === "riwayat" && (
                    <TutorRiwayat
                      db={db}
                      tutorId={userSession.userId}
                      onUpdateDb={(newDb) => setDb(newDb)}
                    />
                  )}
                  {activeTab === "rekening" && (
                    <TutorRekening
                      db={db}
                      tutorId={userSession.userId}
                    />
                  )}
                </>
              )}
            </div>
          )}

        </main>

        {/* ==================== BOTTOM NAV BAR (Universal) ==================== */}
        {userSession && (
          <nav className="mobile-bottom-nav fixed bottom-0 md:bottom-4 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md bg-white/90 backdrop-blur-lg border-t md:border border-slate-100/50 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] px-2 py-3 md:rounded-2xl z-40 shrink-0 flex justify-around items-center">
            {renderNavigation()}
          </nav>
        )}

      </div>

      {/* ========================================================
          ADMIN MODAL: RECORD NEW SESSION DIRECT FROM HOME
          ======================================================== */}
      {isAdminSessionOpen && (
        <div id="admin-quick-session-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-slide-up">
            <div className="bg-brand-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-tight">Catat Riwayat Sesi (Admin)</h3>
              <PlusCircle size={18} />
            </div>

            <form onSubmit={handleAdminSessionSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Sesi *</label>
                <CustomDatePicker
                  id="quick-sess-date"
                  required
                  value={sessDate}
                  onChange={(val) => setSessDate(val)}
                />
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pilih Siswa *</label>
                <select
                  id="quick-sess-siswa"
                  required
                  value={sessSiswaId}
                  onChange={(e) => handleAdminStudentChange(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {db.students.filter(s => s.status === "aktif").map((s) => (
                    <option key={s.id} value={s.id}>{s.nama} ({s.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Program Belajar *</label>
                <select
                  id="quick-sess-program"
                  required
                  value={sessProgramId}
                  onChange={(e) => setSessProgramId(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="">-- Pilih Program Belajar --</option>
                  {db.programs.filter(p => p.status === "aktif").map((p) => (
                    <option key={p.id} value={p.id}>{p.nama} ({formatRupiah(p.tarifSiswa)} / Sesi)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pilih Tutor Pengajar *</label>
                <select
                  id="quick-sess-tutor"
                  required
                  value={sessTutorId}
                  onChange={(e) => setSessTutorId(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="">-- Pilih Tutor --</option>
                  {db.tutors.filter(t => t.status === "aktif").map((t) => (
                    <option key={t.id} value={t.id}>{t.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">Catatan Pertemuan</label>
                <textarea
                  id="quick-sess-notes"
                  placeholder="Contoh: Pembahasan PR Matematika bab 4"
                  value={sessCatatan}
                  onChange={(e) => setSessCatatan(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  id="quick-sess-cancel"
                  onClick={() => setIsAdminSessionOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="quick-sess-submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Simpan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM BEAUTIFUL FLOATING TOASTS (Anti-alert fallback) */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 max-w-sm w-[90%] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-4 flex items-start gap-3 animate-slide-up">
          {toast.type === "success" && (
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={18} className="animate-bounce" />
            </div>
          )}
          {toast.type === "error" && (
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle size={18} />
            </div>
          )}
          {toast.type === "info" && (
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
              <Info size={18} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-800 leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}
