import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";
import { Analytics } from "@vercel/analytics/react";

const CATS = {
  Food: { icon: "🍜", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  Transport: { icon: "🚌", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  Shopping: { icon: "🛍️", color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  Entertainment: { icon: "🎮", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  Health: { icon: "💊", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  Bills: { icon: "💡", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  Other: { icon: "📦", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const PAYMENTS = [
  {
    name: "UPI",
    icon: "📱",
  },
  {
    name: "Cash",
    icon: "💵",
  },
  {
    name: "Card",
    icon: "💳",
  },
];

function getMonthKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}
function getMonthLabel(d) {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
function getLocalDate() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Home() {
  //const [user, setUser] = useState(null); // null = not chosen yet
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [selectedCat, setSelectedCat] = useState("Food");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [expName, setExpName] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [toast, setToast] = useState(null);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showReminderManager, setShowReminderManager] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [supportType, setSupportType] = useState("Bug");
  const [supportMessage, setSupportMessage] = useState("");
  const toastTimer = useRef(null);
  const nameRef = useRef(null);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceIcon, setSpaceIcon] = useState("📁");
  const [announcements, setAnnouncements] = useState([]);
  const monthKey = getMonthKey(currentDate);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderAmount, setReminderAmount] = useState("");
  const [reminderDay, setReminderDay] = useState("");
  const [repeatType, setRepeatType] = useState("monthly");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [oneTimeMonth, setOneTimeMonth] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const createSpace = async () => {
    if (!spaceName.trim()) {
      showToast("Enter space name");
      return;
    }

    const { error } = await supabase.from("spaces").insert({
      user_id: currentUser.id,
      name: spaceName.trim(),
      icon: spaceIcon,
    });

    if (error) {
      showToast("Failed");
      return;
    }

    showToast("Space created 🎉");

    setSpaceName("");
    setSpaceIcon("📁");
    setShowCreateSpace(false);

    fetchSpaces();
  };

  const fetchSpaces = async () => {
    if (!currentUser) return;

    const { data, error } = await supabase

      .from("spaces")

      .select("*")

      .eq("user_id", currentUser.id)

      .order("created_at");

    if (error) return;

    setSpaces(data);

    if (!selectedSpace && data.length > 0) {
      setSelectedSpace(data[0].id);
    }
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("active", true)
      .order("created_at", {
        ascending: false,
      });

    setAnnouncements(data || []);
  };

  // Fetch expenses for current month
  const fetchExpenses = useCallback(async () => {
    if (!currentUser) return;
    const start = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1,
    ).padStart(2, "0")}-01`;

    const end = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      ).getDate(),
    ).padStart(2, "0")}`;
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", currentUser.id)

      .eq("space_id", selectedSpace)
      .gte("date", start)
      .lte("date", end)
      .order("created_at", { ascending: false });
    if (!error) setExpenses(data || []);
  }, [currentDate, currentUser, selectedSpace]);

  const addReminder = async () => {
    const { error } = await supabase.from("reminders").insert({
      user_id: currentUser.id,
      title: reminderTitle,
      amount: Number(reminderAmount),
      due_day: Number(reminderDay),

      repeat_type: repeatType,
      space_id: selectedSpace,

      months: repeatType === "custom" ? selectedMonths : null,

      one_time_month: repeatType === "one_time" ? oneTimeMonth : null,

      active: true,
    });

    if (!error) {
      fetchReminders();

      setReminderTitle("");
      setReminderAmount("");
      setReminderDay("");

      setRepeatType("monthly");
      setSelectedMonths([]);
      setOneTimeMonth("");

      showToast("🔔 Reminder Added");

      setShowReminderManager(false);
    }
  };

  // Fetch budget for current month
  const fetchBudget = useCallback(async () => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", currentUser.id)

      .eq("space_id", selectedSpace)
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
  }, [monthKey, currentUser, selectedSpace]);

  const fetchReminders = useCallback(async () => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", currentUser.id)

      .eq("space_id", selectedSpace)
      .eq("active", true);

    if (!error) {
      setReminders(data || []);
    }
  }, [currentUser, selectedSpace]);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setCurrentUser(data.user);

        const { data: settings } = await supabase
          .from("user_settings")
          .select("onboarding_completed")
          .eq("user_id", data.user.id)
          .single();

        if (!settings?.onboarding_completed) {
          setTimeout(() => {
            setShowOnboarding(true);
          }, 700);
        }
      }

      setLoadingUser(false);
    };

    getUser();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window)) return;

    setTimeout(() => {
      if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }, 1000);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    fetchSpaces();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedSpace) return;

    fetchExpenses();
    fetchBudget();
    fetchReminders();
  }, [selectedSpace, currentDate]);

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

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        () => {
          fetchAnnouncements();
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchExpenses, fetchBudget]);

  useEffect(() => {
    const checkReminder = () => {
      const hour = new Date().getHours();

      // after 7 PM
      if (hour >= 19 && expenses.length === 0) {
        sendNotification(
          "SpendWise 💸",
          "Did you forget to log today's expenses?",
        );
      }
    };

    const timer = setTimeout(checkReminder, 5000);

    return () => clearTimeout(timer);
  }, [expenses]);

  useEffect(() => {
    const today = new Date().getDay();

    // Saturday or Sunday
    if (today === 6 || today === 0) {
      setTimeout(() => {
        sendNotification("Weekend Spending 👀", "Weekend spending check 💸");
      }, 8000);
    }
  }, []);

  useEffect(() => {
    if (!reminders.length) return;

    const now = new Date();

    const today = now.getDate();

    const currentMonth = now.getMonth() + 1;

    const currentMonthKey = `${now.getFullYear()}-${String(currentMonth).padStart(2, "0")}`;

    const due = reminders.filter((r) => {
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

      if (r.paid_month === currentMonth) {
        return false;
      }
      const dueSoon = r.due_day === today || r.due_day === today + 1;

      if (!dueSoon) return false;

      if (r.repeat_type === "monthly") {
        return true;
      }

      if (r.repeat_type === "custom") {
        return r.months?.includes(currentMonth);
      }

      if (r.repeat_type === "one_time") {
        return r.one_time_month === currentMonthKey;
      }

      return false;
    });

    if (due.length > 0) {
      setDueReminders(due);
      setShowReminderPopup(true);
    }
  }, [reminders]);

  // Computed
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const upiTotal = expenses
    .filter((e) => e.payment_mode === "UPI")
    .reduce((s, e) => s + Number(e.amount), 0);

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate();

  const avgDailySpend = Math.round(total / daysInMonth);

  const spendingByDay = {};

  expenses.forEach((e) => {
    spendingByDay[e.date] = (spendingByDay[e.date] || 0) + Number(e.amount);
  });

  const highestDay = Object.entries(spendingByDay).sort(
    (a, b) => b[1] - a[1],
  )[0];

  const cashTotal = expenses
    .filter((e) => e.payment_mode === "Cash")
    .reduce((s, e) => s + Number(e.amount), 0);

  const cardTotal = expenses
    .filter((e) => e.payment_mode === "Card")
    .reduce((s, e) => s + Number(e.amount), 0);
  const remaining = budget - total;
  const budgetPct = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
  const budgetPctNum = budget > 0 ? Math.round((total / budget) * 100) : null;

  useEffect(() => {
    if (budget > 0) {
      const percent = (total / budget) * 100;

      if (percent >= 80 && percent < 100) {
        sendNotification(
          "Budget Alert 🚨",
          "You are close to your monthly budget.",
        );
      }

      if (percent >= 100 && total > 0) {
        sendNotification(
          "Budget Exceeded 😭",
          "You crossed your monthly budget!",
        );
      }
    }
  }, [total, budget]);

  const sendNotification = (title, body) => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window)) return;

    if (Notification.permission !== "granted") return;

    try {
      new Notification(title, {
        body,
        icon: "/icon.png",
      });
    } catch (err) {
      console.log(err);
    }
  };

  const saveBudget = async (val) => {
    if (!currentUser || !selectedSpace) return;

    const num = parseFloat(val) || 0;

    setBudget(num);

    const { error } = await supabase.from("budgets").upsert(
      {
        user_id: currentUser.id,
        space_id: selectedSpace,
        month: monthKey,
        amount: num,
      },
      {
        onConflict: "user_id,month,space_id",
      },
    );

    if (error) {
      console.log(error);
      showToast(error.message);
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

    if (!selectedSpace) {
      showToast("Please select a space");
      return;
    }
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: currentUser.id,

        space_id: selectedSpace,

        name: expName,

        amount: amt,

        category: selectedCat,

        payment_mode: paymentMode,

        date: getLocalDate(),
      })
      .select();
    setExpenses((prev) => [data[0], ...prev]);
    if (error) {
      console.log(error);
      showToast(error.message);
      setLoading(false);
      return;
    }
    showToast(`✅ Added ₹${amt.toLocaleString("en-IN")} · ${selectedCat}`);
    setExpName("");
    setExpAmt("");
    setShowAddModal(false);
    nameRef.current?.focus();
    setLoading(false);
  };

  const updateExpense = async () => {
    if (!editingExpense) return;

    const { error } = await supabase
      .from("expenses")
      .update({
        name: expName,
        amount: Number(expAmt),
        payment_mode: paymentMode,
        category: selectedCat,
      })
      .eq("id", editingExpense.id);

    if (error) {
      showToast("❌ Update failed");
      return;
    }

    showToast("✅ Expense updated");

    setEditingExpense(null);
    setShowAddModal(false);
    setExpName("");
    setExpAmt("");
  };

  const markReminderPaid = async (id) => {
    const now = new Date();

    const paidMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;

    const reminder = reminders.find((r) => r.id === id);

    await supabase
      .from("reminders")
      .update({
        paid_date: new Date().toISOString(),
        paid_month: paidMonth,

        active: reminder?.repeat_type === "one_time" ? false : true,
      })
      .eq("id", id);

    fetchReminders();

    setDueReminders((prev) => prev.filter((r) => r.id !== id));

    showToast("✅ Bill marked paid");
  };

  const uniqueDays = [...new Set(expenses.map((e) => e.date))].sort();

  const currentSpace = spaces.find((s) => s.id === selectedSpace);

  const submitSupportRequest = async () => {
    if (!supportMessage.trim()) {
      showToast("Enter message");
      return;
    }

    const { error } = await supabase.from("support_requests").insert({
      user_id: currentUser.id,
      type: supportType,
      message: supportMessage,
    });

    if (error) {
      showToast("Failed to submit");
      return;
    }

    setSupportMessage("");
    setSupportType("Bug");

    showToast("✅ Submitted");

    setShowHelp(false);
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

  const filtered = (
    filterCat === "All"
      ? expenses
      : expenses.filter((e) => e.category === filterCat)
  ).filter((e) =>
    (e.name || e.title || "").toLowerCase().includes(search.toLowerCase()),
  );

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

  const finishOnboarding = async () => {
    await supabase.from("user_settings").upsert({
      user_id: currentUser.id,
      onboarding_completed: true,
    });

    setShowOnboarding(false);
  };

  const onboardingScreens = [
    {
      icon: "💸",
      title: "Welcome to SpendWise",
      text: "Track every expense and know where your money goes.",
    },
    {
      icon: "🎯",
      title: "Set Budgets",
      text: "Create monthly budgets and avoid overspending.",
    },
    {
      icon: "📈",
      title: "Smart Insights",
      text: "Understand spending patterns with charts and analytics.",
    },
    {
      icon: "🔔",
      title: "Bill Reminders",
      text: "Never miss important payments again.",
    },
  ];

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

      <div style={styles.app} className="app-mobile">
        <div
          style={{
            marginBottom: 20,
            background: "#12121a",
            borderRadius: 16,
            padding: 16,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 12,
              color: "#a78bfa",
            }}
          >
            Spaces
          </div>

          {spaces.map((s) => (
            <div
              key={s.id}
              style={{
                width: "100%",
                marginBottom: 8,
                padding: 12,
                borderRadius: 12,
                background:
                  selectedSpace === s.id ? "#7c3aed" : "rgba(255,255,255,0.05)",
                color: "white",
                cursor: "pointer",
              }}
              onClick={() => setSelectedSpace(s.id)}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
              </div>
            </div>
          ))}

          <button
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "none",
              background: "#22c55e",
              color: "white",
              fontWeight: 700,
            }}
            onClick={() => setShowCreateSpace(true)}
          >
            + Create Space
          </button>
        </div>
        {/* Topbar */}
        <div style={styles.topbar} className="topbar-mobile">
          <div style={styles.logoSm}>
            <div
              style={{
                color: "#a78bfa",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {/* {!selectedSpace ? "Personal Mode" : `Space Mode`} */}
              {currentSpace?.icon}

              {currentSpace?.name}
            </div>
            <span style={{ color: "#ffffff" }}>spend</span>
            <span style={{ color: "#a78bfa" }}>wise</span> 💸
          </div>

          <div className="top-actions">
            <div style={styles.monthNav} className="month-nav-mobile">
              <button style={styles.navBtn} onClick={() => changeMonth(-1)}>
                ‹
              </button>

              <span style={styles.navLabel}>{getMonthLabel(currentDate)}</span>

              <button style={styles.navBtn} onClick={() => changeMonth(1)}>
                ›
              </button>
            </div>
            <button
              className="logout-mobile"
              style={{
                ...styles.userChip,
                height: 48,
              }}
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
        <div style={styles.statsGrid} className="stats-mobile">
          {[
            {
              icon: "💸",
              label: "Total Spent",
              value: `₹${Math.round(total).toLocaleString("en-IN")}`,
              sub: `${expenses.length} transaction${expenses.length !== 1 ? "s" : ""}`,
            },
            {
              icon: budget > 0 && total > budget ? "🚨" : "✅",
              label:
                budget > 0
                  ? remaining < 0
                    ? "Overspent"
                    : "Remaining"
                  : "Daily Avg",
              value:
                budget > 0
                  ? `₹${Math.round(Math.abs(remaining)).toLocaleString("en-IN")}`
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
                {s.icon} {s.name}
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
            className="budget-mobile"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span style={styles.sectionLabel}>Monthly Budget</span>
            <div
              className="top-actions"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
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
                  className="budget-input-mobile"
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
          <div
            className="payments-mobile"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 10,
              marginTop: 16,
            }}
          >
            <div style={styles.payCard}>
              📱 UPI
              <br />₹{upiTotal.toLocaleString("en-IN")}
            </div>

            <div style={styles.payCard}>
              💵 Cash
              <br />₹{cashTotal.toLocaleString("en-IN")}
            </div>

            <div style={styles.payCard}>
              💳 Card
              <br />₹{cardTotal.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Add form */}
        {showAddModal && (
          <div style={styles.addSection} className="add-section-mobile">
            <button
              onClick={() => {
                setShowAddModal(false);
                setEditingExpense(null);
                setExpName("");
                setExpAmt("");
                setSelectedCat("Food");
                setPaymentMode("UPI");
              }}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                zIndex: 20,
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "white",
                fontSize: "1.4rem",
              }}
            >
              ✕
            </button>
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
              {/* Categories */}

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
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

              {/* Payment Modes */}

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {PAYMENTS.map((p) => (
                  <button
                    key={p.name}
                    style={{
                      ...styles.catBtn,
                      ...(paymentMode === p.name ? styles.catBtnActive : {}),
                    }}
                    onClick={() => setPaymentMode(p.name)}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
              <button
                className="submit-mobile"
                style={{ ...styles.submitBtn, opacity: loading ? 0.5 : 1 }}
                onClick={async () => {
                  if (editingExpense) {
                    await updateExpense();
                  } else {
                    await addExpense();
                  }
                }}
                disabled={loading}
              >
                {loading ? "..." : editingExpense ? "✓ Update" : "+ Add"}
              </button>
            </div>
          </div>
        )}

        {/* Main area */}
        <div style={styles.mainArea} className="main-mobile">
          {/* List */}
          <div>
            <div
              style={{
                position: "sticky",
                top: 110,
                paddingTop: 6,
                zIndex: 50,
                background: "rgba(15,23,42,0.96)",
                backdropFilter: "blur(12px)",
                padding: "0.6rem 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <input
                placeholder="🔍 Search expense"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  ...styles.inp,
                  width: "100%",
                  marginBottom: 10,
                }}
              />
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

            <div
              className="transactions-scroll"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                paddingRight: 4,
              }}
            >
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
                  const categoryName = e.category || "Other";
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
                      className="transaction-mobile"
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
                        <div
                          style={styles.expName2}
                          className="transaction-name-mobile"
                        >
                          {e.name || e.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "rgba(240,238,248,0.4)",
                            marginTop: 2,
                            display: "flex",
                            gap: 8,
                          }}
                        >
                          <span style={{ color: c.color }}>{categoryName}</span>
                          <span>
                            •{" "}
                            {e.payment_mode === "UPI"
                              ? "📱 UPI"
                              : e.payment_mode === "Cash"
                                ? "💵 Cash"
                                : "💳 Card"}
                          </span>
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
                        className="transaction-price-mobile"
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
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          marginLeft: 6,
                        }}
                      >
                        <button
                          style={styles.editBtn}
                          onClick={() => {
                            setEditingExpense(e);
                            setExpName(e.name || e.title);
                            setExpAmt(e.amount);
                            setSelectedCat(e.category);
                            setPaymentMode(e.payment_mode);
                            setShowAddModal(true);
                          }}
                        >
                          ✏️
                        </button>

                        <button
                          style={styles.delBtn}
                          onClick={() => deleteExpense(e.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chart sidebar */}
          <div
            style={{ marginTop: 20, width: "100%" }}
            className="chart-mobile"
          >
            <div style={styles.sectionLabel}>By Category</div>
            <div
              className="chart-mobile"
              style={{
                ...styles.budgetSection,
                marginBottom: 12,
                marginTop: 12,
                width: "100%",
              }}
            >
              <DonutChart expenses={expenses} />
            </div>
            <div
              style={{
                ...styles.budgetSection,
                marginBottom: 12,
              }}
            >
              <div style={styles.sectionLabel}>Insights</div>

              <p style={{ color: "#f0eef8" }}>
                📈 Avg Daily Spend: ₹{avgDailySpend}
              </p>
              <p style={{ color: "#f0eef8" }}>
                🔥 Highest Spend Day:{" "}
                {highestDay ? `${highestDay[0]} (₹${highestDay[1]})` : "N/A"}
              </p>

              <p style={{ color: "#f0eef8" }}>
                🏆 Top Category: {topCat?.[0] || "None"}
              </p>

              <p style={{ color: "#f0eef8" }}>
                💰 Largest Expense: ₹
                {Math.max(
                  ...expenses.map((e) => Number(e.amount)),
                  0,
                ).toLocaleString("en-IN")}
              </p>

              <p style={{ color: "#f0eef8" }}>
                📊 Transactions: {expenses.length}
              </p>
            </div>
            <div
              className="budget-controls-mobile"
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
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
      {!showAddModal && (
        <button
          onClick={() => {
            setEditingExpense(null);
            setExpName("");
            setExpAmt("");
            setSelectedCat("Food");
            setPaymentMode("UPI");
            setShowAddModal(true);
          }}
          style={styles.fab}
        >
          +
        </button>
      )}
      {!showAddModal && (
        <button
          style={{
            ...styles.fab,
            right: "105px",
            bottom: "24px",
            width: "56px",
            height: "56px",
            fontSize: "1rem",
            position: "fixed",
          }}
          onClick={() => setShowReminderManager(true)}
        >
          🔔
          {reminders.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#ef4444",
                color: "white",
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
              }}
            >
              {reminders.length}
            </span>
          )}
        </button>
      )}

      {showReminderPopup && (
        <div style={styles.reminderOverlay}>
          <div style={styles.reminderCard}>
            <div
              style={{
                width: "95%",
                maxWidth: 500,
                maxHeight: "85vh",
                overflowY: "auto",
                background: "#12121a",
                borderRadius: 24,
                padding: 20,
              }}
            />
            <h3 style={{ marginTop: 0 }}>🔔 Upcoming Bills</h3>

            {dueReminders.map((r) => (
              <div
                key={r.title}
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                <button
                  onClick={() => markReminderPaid(r.id)}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    background: "#22c55e",
                    border: "none",
                    borderRadius: 10,
                    color: "white",
                    padding: 10,
                    fontWeight: 700,
                  }}
                >
                  ✓ Mark Paid
                </button>
                <div>{r.title}</div>

                <div
                  style={{
                    color: "#a78bfa",
                    fontSize: "0.9rem",
                  }}
                >
                  ₹{r.amount}
                </div>

                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.7,
                  }}
                >
                  {r.due_day === new Date().getDate()
                    ? "Due Today"
                    : "Due Tomorrow"}
                </div>
              </div>
            ))}

            <button
              style={{
                width: "100%",
                height: 48,
                borderRadius: 14,
                marginTop: 10,
              }}
              onClick={() => setShowReminderPopup(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {showReminderManager && (
        <div style={styles.reminderOverlay}>
          <div style={styles.reminderSheet}>
            <h3 style={{ marginTop: 0 }}>🔔 Manage Bills</h3>

            <input
              style={{
                ...styles.inp,
                width: "100%",
                marginBottom: 10,
              }}
              placeholder="Bill Name"
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
            />

            <input
              style={{
                ...styles.inp,
                width: "100%",
                marginBottom: 10,
              }}
              placeholder="Amount"
              type="number"
              value={reminderAmount}
              onChange={(e) => setReminderAmount(e.target.value)}
            />

            <input
              style={{
                ...styles.inp,
                width: "100%",
                marginBottom: 15,
              }}
              placeholder="Due Day (1-31)"
              type="number"
              min="1"
              max="31"
              value={reminderDay}
              onChange={(e) => setReminderDay(e.target.value)}
            />
            <div
              style={{
                marginBottom: 15,
                position: "relative",
              }}
            >
              <div style={{ marginBottom: 8 }}>Repeat Type</div>

              <select
                value={repeatType}
                onChange={(e) => setRepeatType(e.target.value)}
                style={{
                  ...styles.inp,
                  width: "100%",
                  marginBottom: 15,
                  appearance: "none",
                  WebkitAppearance: "none",
                  cursor: "pointer",
                  paddingRight: 40,
                }}
              >
                <option value="monthly">Every Month</option>

                <option value="custom">Specific Months</option>

                <option value="one_time">One Time</option>
              </select>

              <span
                style={{
                  position: "absolute",
                  right: 16,
                  top: 48,
                  color: "#a78bfa",
                  pointerEvents: "none",
                  fontSize: 12,
                }}
              >
                ▼
              </span>
              {repeatType === "custom" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 6,
                    marginBottom: 15,
                  }}
                >
                  {[
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ].map((m, idx) => (
                    <button
                      key={m}
                      type="button"
                      style={{
                        ...styles.catBtn,
                        ...(selectedMonths.includes(idx + 1)
                          ? styles.catBtnActive
                          : {}),
                      }}
                      onClick={() => {
                        if (selectedMonths.includes(idx + 1)) {
                          setSelectedMonths(
                            selectedMonths.filter((x) => x !== idx + 1),
                          );
                        } else {
                          setSelectedMonths([...selectedMonths, idx + 1]);
                        }
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}

              {repeatType === "one_time" && (
                <select
                  value={oneTimeMonth}
                  onChange={(e) => setOneTimeMonth(e.target.value)}
                  style={{
                    ...styles.inp,
                    width: "100%",
                    marginBottom: 15,
                  }}
                >
                  <option value="">Select Month</option>

                  {Array.from({ length: 24 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() + i);

                    const value = `${date.getFullYear()}-${String(
                      date.getMonth() + 1,
                    ).padStart(2, "0")}`;

                    return (
                      <option key={value} value={value}>
                        {date.toLocaleString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <button
              style={{
                ...styles.submitBtn,
                marginBottom: 10,
              }}
              onClick={addReminder}
            >
              ➕ Add Reminder
            </button>

            {reminders.length > 0 && (
              <>
                <div
                  style={{
                    margin: "18px 0 12px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}
                />

                <h4
                  style={{
                    margin: "0 0 12px",
                    color: "#a78bfa",
                  }}
                >
                  Saved Bills
                </h4>
              </>
            )}

            <div
              style={{
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {reminders.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: 10,
                    marginBottom: 8,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(167,139,250,0.15)",
                    boxShadow: "0 4px 20px rgba(124,58,237,0.15)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div>{r.title}</div>

                    <div>₹{r.amount}</div>

                    <div
                      style={{
                        fontSize: "0.8rem",
                        opacity: 0.7,
                      }}
                    >
                      {r.repeat_type === "monthly" &&
                        `Every month on ${r.due_day}`}

                      {r.repeat_type === "custom" &&
                        `Custom months on day ${r.due_day}`}

                      {r.repeat_type === "one_time" &&
                        `One time: ${r.one_time_month}`}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <button onClick={() => markReminderPaid(r.id)}>✅</button>

                    <button
                      onClick={async () => {
                        await supabase
                          .from("reminders")
                          .delete()
                          .eq("id", r.id);

                        fetchReminders();
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              style={{
                ...styles.userChip,
                width: "100%",
                marginTop: 15,
              }}
              onClick={() => setShowReminderManager(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showHelp && (
        <div style={styles.reminderOverlay}>
          <div style={styles.reminderSheet}>
            <h3>❓ Help & Support</h3>

            <div
              style={{
                marginBottom: 20,
              }}
            >
              <details>
                <summary>How do I add an expense?</summary>
                Tap the + button and fill details.
              </details>

              <details>
                <summary>How do budgets work?</summary>
                Set a monthly budget and SpendWise tracks progress.
              </details>

              <details>
                <summary>How do reminders work?</summary>
                Add recurring bills and get notified before due dates.
              </details>

              <details>
                <summary>Is my data secure?</summary>
                Yes. Your data is stored securely in your own account.
              </details>
            </div>

            <h4>Contact Us</h4>

            <select
              value={supportType}
              onChange={(e) => setSupportType(e.target.value)}
              style={{
                ...styles.inp,
                width: "100%",
                marginBottom: 10,
              }}
            >
              <option>Bug</option>

              <option>Feature Request</option>

              <option>Feedback</option>
            </select>

            <textarea
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Describe your issue..."
              style={{
                ...styles.inp,
                width: "100%",
                minHeight: 120,
                resize: "none",
                marginBottom: 10,
              }}
            />

            <button style={styles.submitBtn} onClick={submitSupportRequest}>
              Submit
            </button>

            <button
              style={{
                ...styles.userChip,
                width: "100%",
                marginTop: 10,
              }}
              onClick={() => setShowHelp(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div style={styles.onboardingOverlay}>
          <div style={styles.onboardingCard}>
            <div style={{ fontSize: "4rem" }}>
              {onboardingScreens[onboardingStep].icon}
            </div>

            <h2>{onboardingScreens[onboardingStep].title}</h2>

            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              {onboardingScreens[onboardingStep].text}
            </p>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 20,
              }}
            >
              {onboardingScreens.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background:
                      onboardingStep === i
                        ? "#a78bfa"
                        : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>

            <button
              style={{
                ...styles.submitBtn,
                marginTop: 24,
              }}
              onClick={() => {
                if (onboardingStep === onboardingScreens.length - 1) {
                  finishOnboarding();
                } else {
                  setOnboardingStep((s) => s + 1);
                }
              }}
            >
              {onboardingStep === onboardingScreens.length - 1
                ? "Get Started 🚀"
                : "Next →"}
            </button>

            <button
              style={{
                marginTop: 12,
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.5)",
              }}
              onClick={finishOnboarding}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {showCreateSpace && (
        <div style={styles.reminderOverlay}>
          <div style={styles.reminderSheet}>
            <h3>Create Space</h3>

            <input
              style={{
                ...styles.inp,
                width: "100%",
                marginBottom: 12,
              }}
              placeholder="Space Name"
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
            />

            <input
              value={spaceIcon}
              onChange={(e) => setSpaceIcon(e.target.value)}
              placeholder="🏠"
            />

            <button
              style={{
                ...styles.submitBtn,
                marginBottom: 10,
              }}
              onClick={createSpace}
            >
              Create
            </button>

            <button
              style={{
                ...styles.userChip,
                width: "100%",
              }}
              onClick={() => setShowCreateSpace(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}

      <style jsx global>{`
        body {
          margin: 0;
          overflow-x: hidden;
          font-family: Inter, sans-serif;
          background: #0b1020;
        }

        * {
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          input {
            width: 100% !important;
          }
          .payments-mobile {
            grid-template-columns: repeat(3, 1fr) !important;
          }

          .transactions-scroll {
            padding-right: 4px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          /* smooth scrollbar */
          .transactions-scroll::-webkit-scrollbar {
            width: 4px;
          }

          .transactions-scroll::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 10px;
          }

          .topbar-mobile {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 14px !important;
          }

          .top-actions {
            width: 100%;
            display: flex;
            gap: 10px;
          }

          .month-nav-mobile {
            flex: 1;
            min-width: 0;
          }

          .logout-mobile {
            width: 110px !important;
            justify-content: center;
            text-align: center;
          }

          .stats-mobile {
            grid-template-columns: 1fr !important;
          }

          .main-mobile {
            display: flex !important;
            flex-direction: column !important;
            grid-template-columns: 1fr !important;
          }

          .budget-mobile {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px;
          }

          .budget-controls-mobile {
            width: 100%;
          }

          .budget-input-mobile {
            width: 100% !important;
          }

          .transaction-mobile {
            min-height: 72px;
            padding: 12px !important;
            gap: 8px !important;
            align-items: center !important;
            border-radius: 18px !important;
          }

          .transaction-name-mobile {
            font-size: 0.8rem !important;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .transaction-price-mobile {
            font-size: 0.95rem !important;
            margin-left: auto !important;
            white-space: nowrap;
          }

          .app-mobile {
            padding: 0.8rem !important;
          }

          .add-section-mobile {
            padding: 1.5rem !important;
            padding-top: 4.3rem !important;
          }

          .add-section-mobile button[title="close"] {
            top: 7px !important;
            right: 14px !important;
          }

          .submit-mobile {
            width: 100%;
          }

          .chart-mobile {
            padding: 1rem !important;
            width: 100% !important;
          }
          .statValue {
            font-size: 1.7rem !important;
          }

          .sectionLabel {
            font-size: 0.72rem !important;
          }
        }
      `}</style>
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
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(15,23,42,0.75)",
    backdropFilter: "blur(18px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.2rem",
    padding: "0.8rem 0",
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
    flex: 1,
    minWidth: 0,
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
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    borderRadius: "28px 28px 0 0",
    padding: "5.5rem 1.2rem 1.2rem",
    marginBottom: "1.4rem",
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
    overflow: "hidden",
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
    borderRadius: 16,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    transition: "border-color 0.2s",
    position: "relative",
    overflow: "hidden",
  },
  expIcon2: {
    fontSize: "1rem",
    width: 32,
    height: 32,
    borderRadius: 8,
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
  editBtn: {
    background: "rgba(167,139,250,0.12)",
    border: "1px solid rgba(167,139,250,0.35)",
    color: "#a78bfa",
    width: 26,
    height: 26,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
  payCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "14px",
    textAlign: "center",
    color: "#f0eef8",
    fontWeight: 700,
    fontSize: "0.9rem",
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
  fab: {
    position: "fixed",
    bottom: "24px",
    right: "20px",
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg,#7c3aed,#c084fc)",
    color: "white",
    fontSize: "2rem",
    fontWeight: "700",
    zIndex: 999,
    boxShadow: "0 10px 30px rgba(124,58,237,0.45)",
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
  onboardingOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(10px)",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  onboardingCard: {
    width: "90%",
    maxWidth: 420,
    background: "#12121a",
    borderRadius: 28,
    padding: "2rem",
    color: "white",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 80px rgba(0,0,0,0.5)",
  },
  reminderOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    zIndex: 2000,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  reminderCard: {
    width: "100%",
    background: "#12121a",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    color: "white",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 -10px 40px rgba(0,0,0,0.4)",
  },
  reminderSheet: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#12121a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    color: "white",
    maxHeight: "75vh",
    overflowY: "auto",
    animation: "slideUp 0.25s ease",
  },
};
