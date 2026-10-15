"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import type { AuthUser } from "../store/authStore";

type AuthMode = "login" | "register";

async function apiAuth(
  mode: AuthMode,
  payload: Record<string, string | undefined>
): Promise<{ accessToken: string; user: AuthUser }> {
  const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
  const res = await fetch(`http://localhost:3001${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = Array.isArray(data?.message)
      ? data.message.join("; ")
      : (data?.message ?? "Đã xảy ra lỗi, vui lòng thử lại.");
    throw new Error(msg);
  }
  return data as { accessToken: string; user: AuthUser };
}

// ─── Left Column — Brand Story ───────────────────────────────────────────────

function BrandColumn({ mode }: { mode: AuthMode }) {
  return (
    <section className="lg:col-span-5 flex flex-col justify-start p-8 md:p-10 bg-[#f8f2ee] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f3ede9]/60 via-transparent to-[#ede7e3]/40 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-5">
        <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_24px_-4px_rgba(44,24,16,0.08)] group">
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVAqRtFtw18f-QzjQMsrQyN35NhSkvV4LGxOZyjLLSGk7Z5NodTUTIenINXTboWKuZcGpK2VDt95KnhXzhHeE65Nu_4_e_gWZ-0MxWQJjb3mvzEt0gzo8rA-P49rTdOzPiwl8Yh-2UFTDNH1JvVe_zjxrKjqaNMDZZn_312gFkCnX60MKTWfOcN_yxZWAzuVJDpygqw0xd0PAaB21SJKPz_KqysELcsYc7egdqF491sqwf0WvbQGVj7Q"
            alt="Cozy BrewLite cafe interior with warm latte art"
            width={600}
            height={280}
            unoptimized
            className="w-full h-56 md:h-64 object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/85 via-[#2c1810]/20 to-transparent flex flex-col justify-end p-5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#febc85]/90 text-[#78491d] text-[11px] font-bold w-fit mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#845326]" />
              Crafted for Coffee Lovers
            </span>
            <p className="text-[17px] font-semibold text-white leading-snug drop-shadow-sm font-headline">
              &ldquo;Cà phê ngon, chạm nhẹ là thanh toán.&rdquo;
            </p>
          </div>
        </div>

        {/* Khối Đặc quyền tài khoản BrewLite */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#845326] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#845326]">
              workspace_premium
            </span>
            Đặc quyền tài khoản BrewLite
          </span>
          <div className="space-y-1">
            {[
              {
                icon: "stars",
                filled: true,
                color: "bg-[#ffdcc2]/50 text-[#845326]",
                title: "Tích lũy Hạt Vàng mỗi đơn",
                desc: "Dễ dàng đổi điểm lấy ưu đãi độc quyền.",
              },
              {
                icon: "bolt",
                filled: false,
                color: "bg-[#ffdbce]/50 text-[#2c1810]",
                title: "Bỏ qua hàng chờ quầy pha chế",
                desc: "Đến là lấy món ngay tại kệ Express Pickup thông minh.",
              },
              {
                icon: "notifications_active",
                filled: false,
                color: "bg-[#e7e1dd] text-[#504440]",
                title: "Nhận thông báo Barista tức thì",
                desc: "Cập nhật chính xác từng giây khi tách espresso sẵn sàng.",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-white/70 hover:bg-white transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center shrink-0`}
                >
                  <span
                    className="material-symbols-outlined text-base"
                    style={
                      p.filled
                        ? { fontVariationSettings: "'FILL' 1" }
                        : undefined
                    }
                  >
                    {p.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-semibold text-[#1d1b19] font-body">
                    {p.title}
                  </h4>
                  <p className="text-[12px] text-[#504440] font-body leading-snug">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Khối Đặc quyền dành cho bạn mới (Chỉ hiển thị khi ở tab ĐĂNG KÝ) */}
        {mode === "register" && (
          <div className="flex flex-col gap-2 pt-1 animate-fadeIn">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#845326] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#845326]">
                redeem
              </span>
              Đặc quyền dành cho bạn mới
            </span>
            <div className="space-y-1.5">
              {/* Card 1: Voucher bạn mới */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50/90 to-orange-50/70 border border-amber-200/80 shadow-2xs hover:shadow-xs transition-all">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-[#845326] flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    confirmation_number
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-semibold text-[#2c1810] font-body">
                    Voucher dành cho bạn mới
                  </h4>
                  <p className="text-[12px] text-[#78491d] font-body leading-snug">
                    Giảm 5.000đ cho đơn hàng đầu tiên.
                  </p>
                </div>
              </div>

              {/* Card 2: Quà tặng tích điểm */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50/90 to-orange-50/70 border border-amber-200/80 shadow-2xs hover:shadow-xs transition-all">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-[#845326] flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    stars
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-semibold text-[#2c1810] font-body">
                    Quà tặng tích điểm
                  </h4>
                  <p className="text-[12px] text-[#78491d] font-body leading-snug">
                    Tặng 20 Hạt Vàng ngay khi kích hoạt tài khoản hôm nay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Khối Hạt Arabica Cầu Đất nguyên bản - đặt liền khối, không bị khoảng trống kéo rời */}
        <div className="mt-1 flex items-center justify-between bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-[#2c1810]/5">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[#845326] text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              eco
            </span>
            <span className="text-[11px] text-[#504440] font-body font-medium">
              100% Hạt Arabica Cầu Đất nguyên bản
            </span>
          </div>
          <div className="flex gap-1" title="Roast Level: 4/5">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="w-2.5 h-1.5 rounded-full bg-[#845326]" />
            ))}
            <span className="w-2.5 h-1.5 rounded-full bg-[#e7e1dd]" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/cart";
  const defaultTab = (searchParams.get("tab") as AuthMode) ?? "login";

  const { setAuth, isAuthenticated, _hasHydrated } = useAuthStore();
  const { cartCount } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = mounted ? cartCount() : 0;

  const [mode, setMode] = useState<AuthMode>(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Redirect nếu đã đăng nhập
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [_hasHydrated, isAuthenticated, redirectTo, router]);

  const switchTab = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp. Vui lòng thử lại.");
        return;
      }
      if (!termsAccepted) {
        setError("Vui lòng đồng ý với Điều khoản dịch vụ để tiếp tục.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload =
        mode === "login"
          ? { email, password }
          : { email, password, fullName, phone };
      const { accessToken, user } = await apiAuth(mode, payload);
      setAuth(user, accessToken);
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi, vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fef8f4] flex flex-col font-body">
      {/* Shared Site Header */}
      <Header cartCount={count} />

      {/* Main Content */}
      <main className="flex-1 w-full pt-4 pb-12 bg-[#fef8f4] relative overflow-hidden">
        {/* Ambient orbs */}
        <div className="absolute -top-12 -left-12 w-96 h-96 bg-[#ffdcc2]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-16 w-80 h-80 bg-[#ffdbce]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 py-3 lg:py-4">
          {/* Back to cart link */}
          <div className="mb-4">
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#504440] hover:text-[#2c1810] transition-colors font-body group"
            >
              <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">
                arrow_back
              </span>
              <span>{"Quay lại giỏ hàng".normalize("NFC")}</span>
            </Link>
          </div>

          {/* Master 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch bg-white rounded-3xl shadow-[0_16px_40px_-8px_rgba(44,24,16,0.07)] overflow-hidden">
            {/* Left: Brand Story */}
            <BrandColumn mode={mode} />

            {/* Right: Form (7 cols) */}
            <section className="lg:col-span-7 p-8 md:p-10 flex flex-col justify-center">
              <div className="w-full max-w-xl mx-auto flex flex-col gap-5">
                {/* Tab Switcher */}
                <div className="flex items-center justify-center">
                  <div className="inline-flex p-1 rounded-full bg-[#f3ede9] shadow-inner">
                    <button
                      type="button"
                      id="tab-login-btn"
                      onClick={() => switchTab("login")}
                      className={`px-6 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 flex items-center gap-1.5 font-body ${
                        mode === "login"
                          ? "bg-[#2c1810] text-white shadow-sm"
                          : "text-[#504440] hover:text-[#1d1b19]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        login
                      </span>
                      Đăng nhập
                    </button>
                    <button
                      type="button"
                      id="tab-register-btn"
                      onClick={() => switchTab("register")}
                      className={`px-6 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 flex items-center gap-1.5 font-body ${
                        mode === "register"
                          ? "bg-[#2c1810] text-white shadow-sm"
                          : "text-[#504440] hover:text-[#1d1b19]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        person_add
                      </span>
                      Đăng ký
                    </button>
                  </div>
                </div>

                {/* Dynamic heading */}
                <div className="text-center pt-1">
                  <h1 className="text-[32px] font-bold text-[#2c1810] leading-tight tracking-tight font-headline">
                    {mode === "login"
                      ? "Chào mừng trở lại!"
                      : "Tạo tài khoản BrewLite"}
                  </h1>
                  <p className="text-[15px] text-[#504440] mt-1 font-body">
                    {mode === "login"
                      ? "Đăng nhập để tiếp tục đơn hàng và thanh toán không tiền mặt siêu tốc"
                      : "Trải nghiệm gọi món không chạm và tích lũy ưu đãi độc quyền"}
                  </p>
                </div>

                {/* Auth Form */}
                <form
                  id="auth-form"
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4 mt-2"
                >
                  {/* Register: Full Name */}
                  {mode === "register" && (
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="fullName"
                        className="text-[13px] font-semibold text-[#1d1b19] font-body"
                      >
                        Họ và tên
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-[#827470] text-lg">
                          person
                        </span>
                        <input
                          id="fullName"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Nguyễn Văn An"
                          className="w-full pl-12 pr-4 py-3 bg-[#f8f2ee] focus:bg-white text-[#1d1b19] rounded-2xl placeholder:text-[#827470] focus:outline-none focus:ring-2 focus:ring-[#845326]/50 text-[15px] transition-all shadow-inner font-body"
                        />
                      </div>
                    </div>
                  )}

                  {/* Register: Phone */}
                  {mode === "register" && (
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="phone"
                        className="text-[13px] font-semibold text-[#1d1b19] font-body flex items-center justify-between"
                      >
                        <span>Số điện thoại nhận món</span>
                        <span className="text-[11px] text-[#845326] font-body">
                          Nhận thông báo khi đơn hàng sẵn sàng
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-[#827470] text-lg">
                          phone_iphone
                        </span>
                        <input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="090 123 4567"
                          className="w-full pl-12 pr-4 py-3 bg-[#f8f2ee] focus:bg-white text-[#1d1b19] rounded-2xl placeholder:text-[#827470] focus:outline-none focus:ring-2 focus:ring-[#845326]/50 text-[15px] transition-all shadow-inner font-body"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="email"
                      className="text-[13px] font-semibold text-[#1d1b19] font-body"
                    >
                      Email tài khoản
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-[#827470] text-lg">
                        mail
                      </span>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="barista@brewlite.com"
                        className="w-full pl-12 pr-4 py-3 bg-[#f8f2ee] focus:bg-white text-[#1d1b19] rounded-2xl placeholder:text-[#827470] focus:outline-none focus:ring-2 focus:ring-[#845326]/50 text-[15px] transition-all shadow-inner font-body"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="text-[13px] font-semibold text-[#1d1b19] font-body"
                      >
                        Mật khẩu
                      </label>
                      {mode === "login" && (
                        <a
                          href="#"
                          id="link-forgot-pw"
                          className="text-[11px] text-[#845326] hover:underline font-body"
                        >
                          Quên mật khẩu?
                        </a>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-[#827470] text-lg">
                        lock
                      </span>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 bg-[#f8f2ee] focus:bg-white text-[#1d1b19] rounded-2xl placeholder:text-[#827470] focus:outline-none focus:ring-2 focus:ring-[#845326]/50 text-[15px] transition-all shadow-inner font-body"
                      />
                      <button
                        type="button"
                        className="absolute right-4 text-[#827470] hover:text-[#1d1b19] p-1"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Hiện/ẩn mật khẩu"
                      >
                        <span
                          id="pw-toggle-icon"
                          className="material-symbols-outlined text-lg"
                        >
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Register: Confirm Password */}
                  {mode === "register" && (
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="confirm_password"
                        className="text-[13px] font-semibold text-[#1d1b19] font-body"
                      >
                        Xác nhận mật khẩu
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-[#827470] text-lg">
                          lock_reset
                        </span>
                        <input
                          id="confirm_password"
                          type={showConfirmPw ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-12 py-3 bg-[#f8f2ee] focus:bg-white text-[#1d1b19] rounded-2xl placeholder:text-[#827470] focus:outline-none focus:ring-2 focus:ring-[#845326]/50 text-[15px] transition-all shadow-inner font-body"
                        />
                        <button
                          type="button"
                          className="absolute right-4 text-[#827470] hover:text-[#1d1b19] p-1"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          aria-label="Hiện/ẩn xác nhận mật khẩu"
                        >
                          <span
                            id="cpw-toggle-icon"
                            className="material-symbols-outlined text-lg"
                          >
                            {showConfirmPw ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remember Me / Terms */}
                  <div className="pt-1">
                    {mode === "login" ? (
                      <div
                        id="box-remember"
                        className="flex items-center"
                      >
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded accent-[#2c1810] cursor-pointer"
                          />
                          <span className="text-[13px] text-[#504440] font-body">
                            Ghi nhớ đăng nhập trên thiết bị này
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div
                        id="box-terms"
                        className="flex items-start gap-2 select-none"
                      >
                        <input
                          id="terms"
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#2c1810] cursor-pointer shrink-0"
                        />
                        <label
                          htmlFor="terms"
                          className="text-[13px] text-[#504440] leading-tight cursor-pointer font-body"
                        >
                          Tôi đồng ý với{" "}
                          <a
                            href="#"
                            className="text-[#845326] font-semibold hover:underline"
                          >
                            Điều khoản dịch vụ
                          </a>{" "}
                          và{" "}
                          <a
                            href="#"
                            className="text-[#845326] font-semibold hover:underline"
                          >
                            Chính sách thành viên
                          </a>{" "}
                          tích điểm Hạt Vàng của BrewLite.
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700 font-body flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-red-500 shrink-0 mt-0.5">
                        error
                      </span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* CTA Button */}
                  <button
                    id="auth-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 w-full py-3.5 px-6 rounded-2xl bg-[#2c1810] hover:bg-[#351300] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_8px_20px_rgba(44,24,16,0.15)] hover:shadow-[0_12px_24px_rgba(44,24,16,0.22)] active:scale-[0.99] group font-body"
                  >
                    <span id="auth-submit-text">
                      {isLoading
                        ? "Đang xử lý..."
                        : mode === "login"
                          ? "Đăng nhập vào BrewLite"
                          : "Tạo tài khoản & Đặt món ngay"}
                    </span>
                    {!isLoading ? (
                      <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    ) : (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                  </button>
                </form>

                {/* Security badge */}
                <div className="mt-1 p-3 rounded-2xl bg-[#f8f2ee] flex items-center justify-center gap-2 text-[#504440]">
                  <span className="material-symbols-outlined text-[#845326] text-base">
                    verified_user
                  </span>
                  <span className="text-[11px] font-body">
                    100% Bảo mật dữ liệu & Thanh toán mã hóa đạt chuẩn PCI-DSS
                    Level 1
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
