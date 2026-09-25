"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않아요.");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    // only same-site paths, never "//evil.com" or "/\evil.com"
    const safe = next && /^\/(?![/\\])/.test(next) ? next : "/home";
    router.push(safe);
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="SYLA" width={128} height={128} className="rounded-2xl" priority />
        </div>
        <h1 className="text-xl font-medium text-center mb-1">SYLA</h1>
        <p className="text-sm text-muted text-center mb-8">Servant Youth Leadership Academy</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-accent"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-lg bg-foreground text-background text-sm font-medium mt-2 disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-sm text-muted text-center mt-6">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-accent font-medium">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
