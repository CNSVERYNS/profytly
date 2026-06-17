"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="text-3xl font-bold">
          Login to Profyt<span className="text-green-500">ly</span>
        </h1>

        <div className="mt-8 space-y-4">
          <input
            placeholder="Email"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Password"
            type="password"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-black disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-red-400">{message}</p>}

        <p className="mt-6 text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-green-500">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}