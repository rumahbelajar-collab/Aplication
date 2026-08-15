import * as React from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearAndReset = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus cache lokal dan memuat ulang? Data di Cloud tetap aman.")) {
      try {
        localStorage.removeItem("rumah_belajar_db_v2");
        localStorage.removeItem("rumah_belajar_session");
      } catch (e) {}
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight mb-2">
              Sistem Membutuhkan Pembaruan
            </h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Terjadi sedikit kendala saat memuat tampilan data. Silakan tekan tombol di bawah untuk menyegarkan sistem.
            </p>
            {this.state.error && (
              <div className="bg-slate-100 p-3 rounded-xl text-[11px] font-mono text-slate-600 text-left mb-6 overflow-x-auto max-h-24">
                {this.state.error.toString()}
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RefreshCw size={16} />
                Muat Ulang Aplikasi
              </button>
              <button
                onClick={this.handleClearAndReset}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] rounded-xl transition-all cursor-pointer"
              >
                Bersihkan Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
