import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body?.email || "").trim().toLowerCase();
    const source = (body?.source || "landing").trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Insert into waitlist. Unique constraint on email handles duplicates.
    const { error } = await supabaseAdmin
      .from("waitlist")
      .insert({ email, source });

    if (error) {
      // 23505 = unique violation (already on the list) — treat as success
      if (error.code === "23505") {
        return NextResponse.json(
          { ok: true, message: "You're already on the list!" },
          { status: 200 }
        );
      }
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("Waitlist API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
