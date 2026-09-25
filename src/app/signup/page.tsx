"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message.includes("already registered") ? "이미 가입된 이메일이에요." : "가입 중 문제가 발생했어요.");
      return;
    }
    if (data.session) {
      router.push("/home");
      router.refresh();
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-base font-medium mb-2">이메일을 확인해주세요</p>
        <p className="text-sm text-muted mb-6">가입 확인 링크를 {email}로 보냈어요.</p>
        <Link href="/login" className="text-accent text-sm font-medium">
          로그인으로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="SYLA" width={128} height={128} className="rounded-2xl" priority />
        </div>
        <h1 className="text-xl font-medium text-center mb-1">회원가입</h1>
        <p className="text-sm text-muted text-center mb-8">SYLA에 오신 것을 환영해요</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            required
            placeholder="이름"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-accent"
          />
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
            minLength={6}
            placeholder="비밀번호 (6자 이상)"
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
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <p className="text-sm text-muted text-center mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-accent font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
