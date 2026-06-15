"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMsg(data.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMsg(data.message || "You're on the list! We'll be in touch soon.");
      setEmail("");
    } catch {
      setStatus("error");
      setMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo">
            Profyt<span>ly</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>
            Know your <span className="accent">real</span> Shopify profit — not
            just revenue.
          </h1>
          <p className="sub">
            Shopify shows you sales. Profytly shows what you actually keep after
            ad spend, cost of goods, and shipping. Live, automatic, no
            spreadsheets.
          </p>

          <form className="email-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="you@yourstore.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email address"
            />
            <button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Joining..." : "Get early access →"}
            </button>
          </form>
          {msg && (
            <div
              className={`form-msg ${status === "success" ? "success" : "error"}`}
            >
              {msg}
            </div>
          )}

          <p className="note">
            Join the waitlist. Be first to know when we launch.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="section">
        <div className="container">
          <h2>Revenue looks great. So why is your bank account empty?</h2>
          <p className="lead">
            Your Shopify dashboard says you made $10,000 this month. But after
            Facebook ads, product costs, shipping, and fees — how much did you
            actually keep? Most store owners have no idea, or waste hours every
            week rebuilding the same messy spreadsheet.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="section cream">
        <div className="container">
          <h2>One number that tells you the truth</h2>
          <p className="lead">
            Profytly connects to your store and ad accounts, then does the math
            for you — automatically.
          </p>
          <div className="features">
            <div className="feature">
              <div className="num">1</div>
              <h3>See true net profit, live</h3>
              <p>
                Connect once. Profytly pulls revenue, ad spend, COGS, and fees
                into one number that updates automatically.
              </p>
            </div>
            <div className="feature">
              <div className="num">2</div>
              <h3>Stop guessing on every product</h3>
              <p>
                Know exactly which products make money and which quietly drain
                it — before you scale the wrong one.
              </p>
            </div>
            <div className="feature">
              <div className="num">3</div>
              <h3>No spreadsheets, ever again</h3>
              <p>
                Get a simple morning summary so you always know where you stand,
                right from your pocket.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder note */}
      <section className="section">
        <div className="container">
          <div className="founder">
            <p>
              &ldquo;Built by an e-commerce operator who got tired of never
              knowing the real number.&rdquo;
            </p>
            <p className="lock">
              Early access members get founder pricing locked in for life.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta" id="join">
        <div className="container">
          <h2>Be first in line</h2>
          <p>
            Drop your email and we&rsquo;ll let you know the moment Profytly
            opens.
          </p>

          <form className="email-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="you@yourstore.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email address"
            />
            <button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Joining..." : "Get early access →"}
            </button>
          </form>
          {msg && (
            <div
              className={`form-msg ${status === "success" ? "success" : "error"}`}
            >
              {msg}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          © {new Date().getFullYear()} Profytly. All rights reserved.
        </div>
      </footer>
    </>
  );
}