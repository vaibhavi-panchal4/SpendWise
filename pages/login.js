import { useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      alert("Fill all fields");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }
    window.location.href = "/app";
  };

  return (
    <>
      <style jsx global>{`
        body {
          margin: 0;
          background: #0b1020;
          font-family: Inter, sans-serif;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          background: "linear-gradient(135deg,#0f172a,#111827,#1e1b4b)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "rgba(17,25,40,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
            padding: "2rem",
            backdropFilter: "blur(18px)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          }}
        >
          <h1
            style={{
              color: "white",
              marginBottom: 6,
              fontSize: "2rem",
            }}
          >
            Welcome Back ✨
          </h1>

          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              marginBottom: 24,
            }}
          >
            Login to continue tracking smarter.
          </p>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={login}
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 10,
              padding: 14,
              borderRadius: 16,
              border: "none",
              background: "linear-gradient(135deg,#7c3aed,#c084fc)",
              color: "white",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p
            style={{
              marginTop: 18,
              color: "rgba(255,255,255,0.55)",
              textAlign: "center",
              fontSize: "0.9rem",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              style={{
                color: "#a78bfa",
                textDecoration: "none",
              }}
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  width: "100%",
  marginBottom: 14,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  fontSize: "0.95rem",
  outline: "none",
};
