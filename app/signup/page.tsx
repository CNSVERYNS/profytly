"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [userType, setUserType] = useState("flipper");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        zip_code: zipCode,
        state,
        user_type: userType,
      });
    }

    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="text-3xl font-bold">
          Join Profyt<span className="text-green-500">ly</span>
        </h1>

        <p className="mt-2 text-zinc-400">
          Create your auction workspace account.
        </p>

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

          <input
            placeholder="ZIP Code"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
          />

          <input
            placeholder="State, example: IL"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />

          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3"
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
          >
            <option value="flipper">Flipper</option>
            <option value="dealer">Dealer</option>
            <option value="exporter">Exporter</option>
            <option value="personal">Personal Use</option>
          </select>

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-black disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-red-400">{message}</p>}

        <p className="mt-6 text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-green-500">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}