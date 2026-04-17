import React from "react";
import { AlertTriangle, RotateCcw } from "@/icons/lucide";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[Sommelyx] Unhandled render error:", error);
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F1EC] px-6">
          <div className="max-w-md rounded-3xl border border-neutral-200 bg-white/90 p-6 text-center shadow-[0_20px_60px_-30px_rgba(58,51,39,0.28)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="font-serif text-[24px] font-semibold tracking-[-0.03em] text-neutral-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
              Sommelyx hit a render error. Refresh the page to try again.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#6B7D5A] to-[#4E5F44] px-4 text-[14px] font-semibold text-white shadow-md transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
