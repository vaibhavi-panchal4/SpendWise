import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";

const CATS = {
  Food: { icon: "🍜", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  Transport: { icon: "🚌", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  Shopping: { icon: "🛍️", color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  Entertainment: { icon: "🎮", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  Health: { icon: "💊", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  Bills: { icon: "💡", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  Other: { icon: "📦", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const USERS = ["💜 You", "💙 Him"];

function getMonthKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}
function getMonthLabel(d) {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function Home() {
  //const [user, setUser] = useState(null); // null = not chosen yet
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [selectedCat, setSelectedCat] = useState("Food");
  const [expName, setExpName] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const toastTimer = useRef(null);
  const nameRef = useRef(null);

  const monthKey = getMonthKey(currentDate);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // Fetch expenses for current month
  const fetchExpenses = useCallback(async () => {
    if (!currentUser) return;
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const end = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    )
      .toISOString()
      .split("T")[0];
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", currentUser.id)
      .gte("date", start)
      .lte("date", end)
      .order("created_at", { ascending: false });
    if (!error) setExpenses(data || []);
  }, [currentDate, currentUser]);

  // Fetch budget for current month
  const fetchBudget = useCallback(async () => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("month", monthKey)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      console.log(error);
      return;
    }

    if (data && data.length > 0) {
      setBudget(Number(data[0].amount));
      setBudgetInput(String(data[0].amount));
    } else {
      setBudget(0);
      setBudgetInput("");
    }
  }, [monthKey, currentUser]);
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setCurrentUser(data.user);
      }

      setLoadingUser(false);
    };

    getUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchExpenses();
      fetchBudget();
    }
  }, [currentUser, fetchExpenses, fetchBudget]);
  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("shared-tracker")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          fetchExpenses();
          setLiveIndicator(true);
          setTimeout(() => setLiveIndicator(false), 1500);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets" },
        () => {
          fetchBudget();
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchExpenses, fetchBudget]);

  const saveBudget = async (val) => {
    if (!currentUser) return;

    const num = parseFloat(val) || 0;

    setBudget(num);

    const { error } = await supabase.from("budgets").upsert(
      {
        user_id: currentUser.id,
        month: monthKey,
        amount: num,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,month",
      },
    );

    if (error) {
      console.log(error);
      showToast("Budget save failed");
    } else {
      showToast("Budget saved");
    }
  };

  const addExpense = async () => {
    if (!expName.trim()) {
      showToast("⚠️ Enter what you spent on");
      return;
    }
    const amt = parseFloat(expAmt);
    if (!amt || amt <= 0) {
      showToast("⚠️ Enter a valid amount");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("expenses").insert({
      name: expName.trim(),
      amount: amt,
      category: selectedCat,
      user_id: currentUser.id,
      date: new Date().toISOString().split("T")[0],
    });
    setLoading(false);
    if (error) {
      showToast("❌ Error saving — check Supabase setup");
      return;
    }
    showToast(`✅ Added ₹${amt.toLocaleString("en-IN")} · ${selectedCat}`);
    setExpName("");
    setExpAmt("");
    nameRef.current?.focus();
  };

  const deleteExpense = async (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("expenses").delete().eq("id", id);
    showToast("🗑️ Deleted");
  };

  const changeMonth = (d) => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + d, 1),
    );
    setFilterCat("All");
  };

  // Computed
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const remaining = budget - total;
  const budgetPct = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
  const budgetPctNum = budget > 0 ? Math.round((total / budget) * 100) : null;

  const catTotals = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
  });
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const maxCatAmt = sortedCats[0]?.[1] || 1;
  const topCat = sortedCats[0];
  /*const youTotal = expenses
    .filter((e) => e.added_by === "you")
    .reduce((s, e) => s + Number(e.amount), 0);
  const himTotal = expenses
    .filter((e) => e.added_by === "him")
    .reduce((s, e) => s + Number(e.amount), 0); */

  const filtered =
    filterCat === "All"
      ? expenses
      : expenses.filter((e) => e.category === filterCat);

  // User picker screen
  /*if (user === null) {
    return (
      <>
        
        <div style={styles.orbWrap}>
          <div
            style={{
              ...styles.orb,
              width: 400,
              height: 400,
              background: "#7c3aed",
              top: -100,
              right: -100,
            }}
          />
          <div
            style={{
              ...styles.orb,
              width: 300,
              height: 300,
              background: "#0ea5e9",
              bottom: 100,
              left: -80,
            }}
          />
        </div>
        <div style={styles.pickerWrap}>
          <div style={styles.pickerCard}>
            <div style={styles.logoLg}>
              <span style={{ color: "#ffffff" }}>spend</span>
              <span style={{ color: "#a78bfa" }}>wise</span> 💸
            </div>
            <p style={styles.pickerSub}>Your shared expense tracker</p>
            <p
              style={{
                ...styles.pickerSub,
                fontSize: "0.8rem",
                marginTop: 8,
                opacity: 0.9,
              }}
            >
              Who are you?
            </p>
            <div style={styles.pickerBtns}>
              {USERS.map((u, i) => (
                <button
                  key={i}
                  style={styles.pickerBtn}
                  onClick={() => setUser(i)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#a78bfa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.1)")
                  }
                >
                  <span style={{ fontSize: "2rem" }}>{u.split(" ")[0]}</span>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: "rgba(240,238,248,0.7)",
                      marginTop: 6,
                    }}
                  >
                    {u.split(" ")[1]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }
*/

  if (loadingUser) {
    /*<Head>
      <style jsx global>{`
        body {
          margin: 0;
          overflow-x: hidden;
          background: #0b1020;
          font-family: Inter, sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .mobile-stack {
            flex-direction: column !important;
          }
        }
      `}</style>
      <title>SpendWise 💸</title>
    </Head>;*/
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1020",
          color: "white",
          fontSize: "1.2rem",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }

    return null;
  }
  return (
    <>
      <Head>
        <title>SpendWise 💸</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.orbWrap}>
        <div
          style={{
            ...styles.orb,
            width: 400,
            height: 400,
            background: "#7c3aed",
            top: -100,
            right: -100,
          }}
        />
        <div
          style={{
            ...styles.orb,
            width: 300,
            height: 300,
            background: "#0ea5e9",
            bottom: 100,
            left: -80,
          }}
        />
        <div
          style={{
            ...styles.orb,
            width: 200,
            height: 200,
            background: "#f472b6",
            bottom: -50,
            right: 200,
          }}
        />
      </div>

      <div style={styles.app}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div style={styles.logoSm}>
            <span style={{ color: "#ffffff" }}>spend</span>
            <span style={{ color: "#a78bfa" }}>wise</span> 💸
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {liveIndicator && <span style={styles.liveDot}>🟢 Live</span>}
            <div style={styles.monthNav}>
              <button style={styles.navBtn} onClick={() => changeMonth(-1)}>
                ‹
              </button>
              <span style={styles.navLabel}>{getMonthLabel(currentDate)}</span>
              <button style={styles.navBtn} onClick={() => changeMonth(1)}>
                ›
              </button>
            </div>
            <button
              style={styles.userChip}
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          {[
            {
              icon: "💸",
              label: "Total Spent",
              value: `₹${Math.round(total).toLocaleString("en-IN")}`,
              sub: `${expenses.length} transaction${expenses.length !== 1 ? "s" : ""}`,
            },
            {
              icon: budget > 0 && total > budget ? "🚨" : "✅",
              label: budget > 0 ? "Remaining" : "Daily Avg",
              value:
                budget > 0
                  ? `₹${Math.abs(Math.round(remaining)).toLocaleString("en-IN")}`
                  : `₹${expenses.length ? Math.round(total / new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()).toLocaleString("en-IN") : 0}`,
              sub:
                budget > 0
                  ? remaining < 0
                    ? "over budget"
                    : "left this month"
                  : "per day",
              valueColor:
                budget > 0
                  ? remaining < 0
                    ? "#f87171"
                    : "#34d399"
                  : "#f0eef8",
            },
            /* {
              icon: "💜",
              label: "You spent",
              value: `₹${Math.round(youTotal).toLocaleString("en-IN")}`,
              sub: `${expenses.filter((e) => e.added_by === "you").length} entries`,
            },
            {
              icon: "💙",
              label: "Him spent",
              value: `₹${Math.round(himTotal).toLocaleString("en-IN")}`,
              sub: `${expenses.filter((e) => e.added_by === "him").length} entries`,
            },*/
          ].map((s, i) => (
            <div
              key={i}
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
              }}
            >
              <div style={{ fontSize: "1.2rem", marginBottom: 6 }}>
                {s.icon}
              </div>
              <div style={styles.statLabel}>{s.label}</div>
              <div
                style={{
                  ...styles.statValue,
                  color: s.valueColor || "#f0eef8",
                }}
              >
                {s.value}
              </div>
              <div style={styles.statSub}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Budget */}
        <div style={styles.budgetSection}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span style={styles.sectionLabel}>Monthly Budget</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(240,238,248,0.4)",
                    fontSize: 13,
                  }}
                >
                  ₹
                </span>
                <input
                  style={styles.budgetInput}
                  type="number"
                  placeholder="Set budget"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onBlur={(e) => saveBudget(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && saveBudget(e.target.value)
                  }
                />
              </div>
              <span
                style={{
                  ...styles.badge,
                  color:
                    budgetPctNum > 90
                      ? "#f87171"
                      : budgetPctNum > 70
                        ? "#fbbf24"
                        : "rgba(240,238,248,0.45)",
                }}
              >
                {budgetPctNum !== null ? `${budgetPctNum}% used` : "No budget"}
              </span>
            </div>
          </div>
          <div style={styles.budgetTrack}>
            <div
              style={{
                ...styles.budgetFill,
                width: `${budgetPct}%`,
                background:
                  total > budget && budget > 0
                    ? "linear-gradient(90deg,#dc2626,#f87171)"
                    : "linear-gradient(90deg,#7c3aed,#a78bfa)",
              }}
            />
          </div>
        </div>

        {/* Add form */}
        <div style={styles.addSection}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <input
              ref={nameRef}
              style={{ ...styles.inp, flex: 1, minWidth: 180 }}
              placeholder="What did you spend on?"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExpense()}
              maxLength={60}
            />
            <input
              style={{
                ...styles.inp,
                width: "100%",
                fontFamily: "'Syne',sans-serif",
                fontWeight: 700,
              }}
              placeholder="₹ Amount"
              type="number"
              min="1"
              value={expAmt}
              onChange={(e) => setExpAmt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExpense()}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
              {Object.entries(CATS).map(([cat, c]) => (
                <button
                  key={cat}
                  style={{
                    ...styles.catBtn,
                    ...(selectedCat === cat ? styles.catBtnActive : {}),
                  }}
                  onClick={() => setSelectedCat(cat)}
                >
                  {c.icon} {cat}
                </button>
              ))}
            </div>
            <button
              style={{ ...styles.submitBtn, opacity: loading ? 0.5 : 1 }}
              onClick={addExpense}
              disabled={loading}
            >
              {loading ? "..." : "+ Add"}
            </button>
          </div>
        </div>

        {/* Main area */}
        <div style={styles.mainArea}>
          {/* List */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={styles.sectionLabel}>
                {filterCat === "All"
                  ? "All Transactions"
                  : `${CATS[filterCat]?.icon} ${filterCat}`}
              </span>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {["All", ...Object.keys(CATS)].map((c) => (
                  <button
                    key={c}
                    style={{
                      ...styles.fpill,
                      ...(filterCat === c ? styles.fpillActive : {}),
                    }}
                    onClick={() => setFilterCat(c)}
                  >
                    {c === "All" ? "All" : `${CATS[c].icon} ${c}`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.length === 0 ? (
                <div style={styles.emptyState}>
                  <div
                    style={{
                      fontSize: "2.5rem",
                      marginBottom: 10,
                      opacity: 0.3,
                    }}
                  >
                    🪙
                  </div>
                  <p style={{ fontSize: "0.85rem" }}>
                    {filterCat === "All"
                      ? "No expenses yet this month. Add your first one above!"
                      : `No ${filterCat} expenses this month.`}
                  </p>
                </div>
              ) : (
                filtered.map((e) => {
                  const c = CATS[e.category] || CATS.Other;
                  const d = new Date(e.date + "T00:00:00");
                  const dateStr = d.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  });
                  //const isYou = e.added_by === "you";
                  return (
                    <div
                      key={e.id}
                      style={styles.expItem}
                      onMouseEnter={(el) =>
                        (el.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.13)")
                      }
                      onMouseLeave={(el) =>
                        (el.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.07)")
                      }
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          background: c.color,
                          borderRadius: "2px 0 0 2px",
                        }}
                      />
                      <div style={{ ...styles.expIcon2, background: c.bg }}>
                        {c.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={styles.expName2}>{e.name}</div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "rgba(240,238,248,0.4)",
                            marginTop: 2,
                            display: "flex",
                            gap: 8,
                          }}
                        >
                          <span style={{ color: c.color }}>{e.category}</span>
                          {/*<span
                            style={{ color: isYou ? "#a78bfa" : "#60a5fa" }}
                          >
                            {isYou ? "💜 You" : "💙 Him"}
                          </span>*/}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "rgba(240,238,248,0.35)",
                          flexShrink: 0,
                        }}
                      >
                        {dateStr}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Syne',sans-serif",
                          fontWeight: 800,
                          fontSize: "1rem",
                          color: c.color,
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                      >
                        ₹{Number(e.amount).toLocaleString("en-IN")}
                      </div>
                      <button
                        style={styles.delBtn}
                        onClick={() => deleteExpense(e.id)}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chart sidebar */}
          <div>
            <div style={styles.sectionLabel}>By Category</div>
            <div
              style={{
                ...styles.budgetSection,
                marginBottom: 12,
                marginTop: 12,
              }}
            >
              <DonutChart expenses={expenses} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sortedCats.map(([cat, amt]) => {
                const c = CATS[cat] || CATS.Other;
                const w = Math.round((amt / maxCatAmt) * 100);
                return (
                  <div key={cat}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "rgba(240,238,248,0.5)",
                        }}
                      >
                        {c.icon} {cat}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Syne',sans-serif",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: c.color,
                        }}
                      >
                        ₹{Math.round(amt).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${w}%`,
                          background: c.color,
                          borderRadius: 3,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {sortedCats.length === 0 && (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "rgba(240,238,248,0.3)",
                    textAlign: "center",
                    padding: "1rem 0",
                  }}
                >
                  No data yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}
    </>
  );
}

function DonutChart({ expenses }) {
  const totals = {};
  expenses.forEach((e) => {
    totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
  });
  const grand = Object.values(totals).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const cx = 80,
    cy = 80,
    r = 54,
    sw = 18,
    circ = 2 * Math.PI * r;
  let offset = 0;
  const totalStr =
    grand >= 100000
      ? `₹${(grand / 100000).toFixed(1)}L`
      : grand >= 1000
        ? `₹${(grand / 1000).toFixed(1)}K`
        : `₹${Math.round(grand).toLocaleString("en-IN")}`;

  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      style={{ display: "block", margin: "0 auto" }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={sw}
      />
      {sorted.length === 0 && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.2)"
          fontSize="12"
          fontFamily="Syne,sans-serif"
        >
          No data
        </text>
      )}
      {sorted.map(([cat, amt]) => {
        const frac = amt / grand;
        const dash = frac * circ;
        const gap = circ - dash;
        const c = CATS[cat] || CATS.Other;
        const dashOffset = -offset * circ;
        offset += frac;
        return (
          <circle
            key={cat}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={c.color}
            strokeWidth={sw}
            strokeDasharray={`${dash.toFixed(2)} ${gap.toFixed(2)}`}
            strokeDashoffset={dashOffset.toFixed(2)}
            opacity={0.9}
          />
        );
      })}
      {grand > 0 && (
        <>
          <text
            x={cx}
            y={cy - 9}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(240,238,248,0.35)"
            fontSize="8"
            fontFamily="Syne,sans-serif"
            fontWeight="700"
          >
            SPENT
          </text>
          <text
            x={cx}
            y={cy + 9}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#f0eef8"
            fontSize="13"
            fontFamily="Syne,sans-serif"
            fontWeight="800"
          >
            {totalStr}
          </text>
        </>
      )}
    </svg>
  );
}

const styles = {
  orbWrap: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(80px)",
    opacity: 0.18,
  },
  app: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "1rem",
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0f172a,#111827,#1e1b4b)",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "2rem",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    flexWrap: "wrap",
    gap: 16,
  },
  logoLg: {
    fontFamily: "'Syne',sans-serif",
    fontSize: "2rem",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  logoSm: {
    fontFamily: "'Syne',sans-serif",
    fontSize: "1.3rem",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  monthNav: {
    display: "flex",
    alignItems: "center",
    background: "#12121a",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    maxWidth: 260,
  },
  navBtn: {
    background: "none",
    border: "none",
    color: "rgba(240,238,248,0.45)",
    padding: "8px 14px",
    fontSize: 18,
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
  },
  navLabel: {
    fontFamily: "'Syne',sans-serif",
    fontSize: "0.9rem",
    fontWeight: 700,
    padding: "10px 22px",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    minWidth: 170,
    textAlign: "center",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#ffffff",
  },
  userChip: {
    background: "rgba(167,139,250,0.1)",
    border: "1px solid rgba(167,139,250,0.3)",
    borderRadius: 20,
    color: "#f0eef8",
    padding: "6px 14px",
    fontSize: "0.82rem",
    fontWeight: 500,
    transition: "all 0.2s",
  },
  liveDot: { fontSize: "0.72rem", color: "#34d399", fontWeight: 500 },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 16,
    marginBottom: "1.5rem",
  },
  statCard: {
    background: "rgba(17, 25, 40, 0.75)",
    backdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: "1.4rem",
    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
    transition: "0.3s ease",
    transform: "translateY(0)",
  },
  statLabel: {
    fontSize: "0.7rem",
    color: "rgba(240,238,248,0.45)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 500,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: "'Syne',sans-serif",
    fontSize: "2rem",
    fontWeight: 800,
    lineHeight: 1,
    marginTop: 6,
  },
  statSub: {
    fontSize: "0.7rem",
    color: "rgba(240,238,248,0.35)",
    marginTop: 4,
  },
  budgetSection: {
    background: "#12121a",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: "1.1rem 1.3rem",
    marginBottom: "1.5rem",
  },
  sectionLabel: {
    fontFamily: "'Syne',sans-serif",
    fontSize: "0.78rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(240,238,248,0.45)",
  },
  budgetInput: {
    background: "#1a1a26",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: 8,
    color: "#f0eef8",
    fontFamily: "'Syne',sans-serif",
    fontSize: "0.9rem",
    fontWeight: 700,
    padding: "6px 10px 6px 24px",
    width: 140,
    outline: "none",
  },
  badge: {
    fontFamily: "'Syne',sans-serif",
    fontSize: "0.78rem",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 20,
    background: "#1a1a26",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  budgetTrack: {
    height: 6,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 8,
  },
  budgetFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
  },
  addSection: {
    background: "rgba(17, 25, 40, 0.72)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: "1.8rem",
    marginBottom: "2rem",
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
  },
  inp: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    color: "#fff",
    fontSize: "0.95rem",
    padding: "14px 16px",
    outline: "none",
    transition: "0.25s ease",
  },
  catBtn: {
    background: "#1a1a26",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 8,
    color: "rgba(240,238,248,0.45)",
    padding: "7px 12px",
    fontSize: "0.78rem",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  catBtnActive: {
    background: "rgba(167,139,250,0.12)",
    borderColor: "#a78bfa",
    color: "#a78bfa",
  },
  submitBtn: {
    background: "linear-gradient(135deg,#7c3aed,#c084fc)",
    border: "none",
    width: "100%",
    borderRadius: 18,
    color: "white",
    fontSize: "0.95rem",
    fontWeight: 700,
    padding: "14px 28px",
    cursor: "pointer",
    boxShadow: "0 8px 25px rgba(124,58,237,0.45)",
    transition: "0.3s ease",
  },
  mainArea: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: 28,
    alignItems: "start",
  },
  fpill: {
    background: "#12121a",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20,
    color: "rgba(240,238,248,0.45)",
    padding: "4px 10px",
    fontSize: "0.72rem",
    transition: "all 0.2s",
    fontWeight: 500,
  },
  fpillActive: {
    background: "rgba(167,139,250,0.12)",
    borderColor: "#a78bfa",
    color: "#a78bfa",
  },
  expItem: {
    background: "#12121a",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: "11px 14px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "border-color 0.2s",
    position: "relative",
    overflow: "hidden",
  },
  expIcon2: {
    fontSize: "1.2rem",
    width: 36,
    height: 36,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  expName2: {
    fontSize: "0.88rem",
    fontWeight: 500,
    color: "#f0eef8",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  delBtn: {
    background: "none",
    border: "none",
    color: "rgba(240,238,248,0.25)",
    fontSize: 13,
    width: 26,
    height: 26,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.2s",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 1rem",
    color: "rgba(240,238,248,0.35)",
  },
  pickerWrap: {
    position: "relative",
    zIndex: 1,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCard: {
    background: "rgba(10,10,20,0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 32,
    padding: "3rem",
    textAlign: "center",
    maxWidth: 420,
    width: "100%",
    boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
    backdropFilter: "blur(20px)",
  },
  pickerSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "0.95rem",
    marginTop: 10,
  },
  pickerBtns: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    marginTop: 28,
  },
  pickerBtn: {
    background: "#1a1a26",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "1.5rem 2rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    transition: "all 0.25s",
    cursor: "pointer",
    color: "#f0eef8",
  },
  toast: {
    position: "fixed",
    bottom: "2rem",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1a1a26",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: 12,
    padding: "12px 20px",
    fontSize: "0.85rem",
    color: "#f0eef8",
    zIndex: 999,
    whiteSpace: "nowrap",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
};
