import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Landing() {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        window.location.href = "/app";
        return;
      }

      setCheckingAuth(false);
    };

    checkUser();
  }, []);

  if (checkingAuth) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        body {
          margin: 0;
          font-family: Inter, sans-serif;
          background: #0b1020;
          color: white;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>

      <div style={styles.page}>
        {/* HERO */}
        <section style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.title}>
              Know where every <span style={{ color: "#a78bfa" }}>₹</span> goes
            </h1>

            <p style={styles.subtitle}>
              SpendWise helps students and professionals track expenses, manage
              budgets, and stay in control of their money.
            </p>

            <div style={styles.buttons}>
              <Link href="/signup">
                <button style={styles.primaryBtn}>Start Free 🚀</button>
              </Link>

              <a href="#features">
                <button style={styles.secondaryBtn}>Learn More</button>
              </a>
            </div>
          </div>
        </section>

        {/* WHY */}
        <section style={styles.section}>
          <h2 style={styles.heading}>Why SpendWise?</h2>

          <div style={styles.grid}>
            <div style={styles.card}>⚡ Track expenses in under 10 seconds</div>

            <div style={styles.card}>🎯 Set monthly budgets</div>

            <div style={styles.card}>📊 Visual spending insights</div>

            <div style={styles.card}>🔔 Never miss bill reminders</div>
          </div>
        </section>

        {/* COMPARISON */}
        <section style={styles.section}>
          <h2 style={styles.heading}>Why not Notes or Excel?</h2>

          <div style={styles.compare}>
            <div style={styles.compareCard}>
              <h3>📝 Notes</h3>

              <p>❌ No budget tracking</p>
              <p>❌ No insights</p>
              <p>❌ Hard to organize</p>
            </div>

            <div style={styles.compareCard}>
              <h3>📊 Excel</h3>

              <p>❌ Time consuming</p>
              <p>❌ Manual calculations</p>
              <p>❌ Not mobile friendly</p>
            </div>

            <div
              style={{
                ...styles.compareCard,
                border: "1px solid #a78bfa",
              }}
            >
              <h3>💸 SpendWise</h3>

              <p>✅ Instant tracking</p>
              <p>✅ Smart insights</p>
              <p>✅ Budget management</p>
              <p>✅ Install like an app</p>
            </div>
          </div>
        </section>

        {/* SCREENSHOTS */}
        <section id="features" style={styles.section}>
          <h2 style={styles.heading}>Screenshots</h2>

          <div style={styles.screenshotGrid}>
            <div style={styles.phoneFrame}>
              <img
                src="/screenshots/dashboard.jpeg"
                alt="Dashboard"
                style={styles.screenshot}
              />
            </div>

            <div style={styles.phoneFrame}>
              <img
                src="/screenshots/add-expense.jpeg"
                alt="Add Expense"
                style={styles.screenshot}
              />
            </div>

            <div style={styles.phoneFrame}>
              <img
                src="/screenshots/add-reminder.jpeg"
                alt="Add Reminder"
                style={styles.screenshot}
              />
            </div>

            <div style={styles.phoneFrame}>
              <img
                src="/screenshots/insights.jpeg"
                alt="Insights"
                style={styles.screenshot}
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={styles.cta}>
          <h2 style={{ fontSize: "2rem" }}>Start Tracking Today</h2>

          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              maxWidth: 500,
            }}
          >
            Take control of your spending one expense at a time.
          </p>

          <Link href="/signup">
            <button style={styles.primaryBtn}>Launch SpendWise 🚀</button>
          </Link>
        </section>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0f172a,#111827,#1e1b4b)",
  },

  hero: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1.5rem 2rem",
    textAlign: "center",
  },

  heroContent: {
    maxWidth: "850px",
  },

  title: {
    fontSize: "4rem",
    fontWeight: "800",
    marginBottom: "1rem",
    lineHeight: 1.1,
  },

  subtitle: {
    fontSize: "1.2rem",
    color: "rgba(255,255,255,0.7)",
    marginBottom: "2rem",
  },

  buttons: {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    flexWrap: "wrap",
  },

  primaryBtn: {
    padding: "14px 28px",
    borderRadius: "14px",
    border: "none",
    cursor: "pointer",
    fontWeight: "700",
    color: "white",
    background: "linear-gradient(135deg,#7c3aed,#c084fc)",
  },

  secondaryBtn: {
    padding: "14px 28px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    color: "white",
    cursor: "pointer",
  },

  section: {
    padding: "2.5rem 1.5rem",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  heading: {
    textAlign: "center",
    marginBottom: "1.2rem",
    fontSize: "2rem",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "1rem",
  },

  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "1.5rem",
    borderRadius: "20px",
    textAlign: "center",
  },

  compare: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
    gap: "1rem",
  },

  compareCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "1.5rem",
    borderRadius: "20px",
  },

  mock: {
    height: "420px",
    borderRadius: "30px",
    border: "2px dashed rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.4)",
  },

  cta: {
    textAlign: "center",
    padding: "3rem 1.5rem 4rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },

  screenshotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
    gap: "2rem",
  },

  phoneFrame: {
    background: "#000",
    padding: "12px",
    borderRadius: "32px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    transition: "0.3s",
  },

  screenshot: {
    width: "100%",
    display: "block",
    borderRadius: "22px",
  },
};

<style jsx global>{`
  @media (max-width: 768px) {
    h1 {
      font-size: 2.4rem !important;
    }

    h2 {
      font-size: 1.6rem !important;
    }
  }
`}</style>;
