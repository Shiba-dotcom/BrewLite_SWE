"use client";

import React, { useState } from "react";
import Link from "next/link";
import BrewLiteLogo from "./BrewLiteLogo";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setJoined(true);
      setTimeout(() => setJoined(false), 3000);
      setEmail("");
    }
  };

  return (
    <footer className="w-full bg-[#f8f2ee] pt-10 pb-8 mt-12 border-t border-[#2c1810]/5 shadow-[0_-1px_12px_rgba(44,24,16,0.03)]">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Column 1: Brand & Logo */}
          <div className="flex flex-col gap-3">
            <Link href="/menu" className="flex items-center gap-2">
              <BrewLiteLogo className="h-8 w-auto" />
            </Link>
            <p className="text-[13px] leading-[20px] text-[#504440]">
              Artisanal espresso craft filtered through unhurried simplicity.
              Truly contactless and cashless ordering at every roastery bar.
            </p>
            <div className="flex items-center gap-2 mt-2 text-[#504440] text-[11px] font-bold">
              <span className="material-symbols-outlined text-base text-[#845326]">
                local_cafe
              </span>
              <span>Fresh Micro-Batches Daily</span>
            </div>
          </div>

          {/* Column 2: Roastery Hours */}
          <div className="flex flex-col gap-3">
            <span className="font-serif text-[18px] leading-[26px] font-semibold text-[#1d1b19]">
              Roastery Hours
            </span>
            <ul className="space-y-1.5 text-[13px] leading-[20px] text-[#504440]">
              <li>
                <strong className="text-[#1d1b19] font-semibold">
                  Monday – Friday:
                </strong>{" "}
                06:30 – 18:30
              </li>
              <li>
                <strong className="text-[#1d1b19] font-semibold">
                  Saturday:
                </strong>{" "}
                07:00 – 19:00
              </li>
              <li>
                <strong className="text-[#1d1b19] font-semibold">
                  Sunday:
                </strong>{" "}
                07:30 – 17:00
              </li>
              <li className="pt-1 text-[#845326] text-[11px] font-bold">
                Order ahead opens 15 mins prior
              </li>
            </ul>
          </div>

          {/* Column 3: Cashless Payments */}
          <div className="flex flex-col gap-3">
            <span className="font-serif text-[18px] leading-[26px] font-semibold text-[#1d1b19]">
              Cashless Payments
            </span>
            <p className="text-[13px] leading-[20px] text-[#504440]">
              We operate as a 100% cashless counter for speedy pickup and
              hygienic service.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1 rounded bg-[#f3ede9] text-[11px] font-bold text-[#504440] border border-[#d3c3be]/40">
                Apple Pay
              </span>
              <span className="px-2.5 py-1 rounded bg-[#f3ede9] text-[11px] font-bold text-[#504440] border border-[#d3c3be]/40">
                Google Pay
              </span>
              <span className="px-2.5 py-1 rounded bg-[#f3ede9] text-[11px] font-bold text-[#504440] border border-[#d3c3be]/40">
                QR MoMo
              </span>
              <span className="px-2.5 py-1 rounded bg-[#f3ede9] text-[11px] font-bold text-[#504440] border border-[#d3c3be]/40">
                Tap Cards
              </span>
            </div>
          </div>

          {/* Column 4: Secret Roast Club Newsletter */}
          <div className="flex flex-col gap-3">
            <span className="font-serif text-[18px] leading-[26px] font-semibold text-[#1d1b19]">
              The Secret Roast Club
            </span>
            <p className="text-[13px] leading-[20px] text-[#504440]">
              Get early tasting alerts and monthly secret menu recipes directly
              to your inbox.
            </p>
            <form onSubmit={handleJoin} className="flex flex-col gap-1.5 mt-1">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="barista@brewlite.com"
                  className="bg-white px-3.5 py-2 rounded-lg text-[13px] text-[#1d1b19] placeholder:text-[#827470] border border-[#d3c3be]/50 focus:outline-none focus:ring-2 focus:ring-[#845326] flex-1"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#2c1810] text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-[#351300] transition-colors"
                >
                  {joined ? "Joined!" : "Join"}
                </button>
              </div>
              <span className="text-[11px] font-bold text-[#504440]">
                No spam, purely single-origin notes.
              </span>
            </form>
          </div>
        </div>

        {/* Bottom copyright & legal links */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#2c1810]/10">
          <span className="text-[13px] text-[#504440]">
            © 2024 BrewLite Coffee Roasters. All rights reserved.
          </span>
          <div className="flex items-center gap-6 text-[11px] font-bold text-[#504440]">
            <Link href="#" className="hover:text-[#1d1b19] transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-[#1d1b19] transition-colors">
              Terms of Pour
            </Link>
            <Link href="#" className="hover:text-[#1d1b19] transition-colors">
              Barista Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
