import { useState, useEffect, useCallback } from "react";

const API_BASE = "";
const CACHE_KEY = "kviz_questions_cache";
const RESULTS_KEY = "kviz_last_results";

// Shuffle array (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

// Zamíchá odpovědi a uloží mapování shuffled index → původní index
// API vždy vrací správnou odpověď jako index 0
function shuffleOptions(q) {
  const indexed = q.options.map((opt, i) => ({ opt, originalIndex: i }));
  const shuffled = shuffle(indexed);
  return {
    ...q,
    options: shuffled.map(x => x.opt),
    optionMap: shuffled.map(x => x.originalIndex), // optionMap[shuffledIdx] = originalIdx
  };
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #13131a;
    --surface2: #1c1c28;
    --border: rgba(255,255,255,0.07);
    --accent: #7c6df7;
    --accent2: #f0a04b;
    --correct: #3ecf8e;
    --wrong: #f06a6a;
    --text: #f0eeff;
    --muted: rgba(240,238,255,0.45);
    --radius: 16px;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    position: relative;
    overflow: hidden;
  }

  .app::before {
    content: '';
    position: fixed;
    top: -40%;
    left: -20%;
    width: 70vw;
    height: 70vw;
    background: radial-gradient(circle, rgba(124,109,247,0.12) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .app::after {
    content: '';
    position: fixed;
    bottom: -30%;
    right: -10%;
    width: 55vw;
    height: 55vw;
    background: radial-gradient(circle, rgba(240,160,75,0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .card {
    position: relative;
    z-index: 1;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 40px 40px;
    width: 100%;
    max-width: 640px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.5);
    animation: cardIn 0.5s cubic-bezier(0.22,1,0.36,1);
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: none; }
  }

  .offline-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent2);
    background: rgba(240,160,75,0.12);
    border: 1px solid rgba(240,160,75,0.25);
    border-radius: 100px;
    padding: 4px 12px;
    margin-bottom: 20px;
  }

  .logo {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 13px;
    color: var(--muted);
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }

  h1 {
    font-size: clamp(28px, 5vw, 40px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin-bottom: 8px;
  }

  h1 span { color: var(--accent); }

  .subtitle {
    color: var(--muted);
    font-size: 14px;
    margin-bottom: 32px;
    line-height: 1.5;
  }

  .progress-bar-wrap {
    background: var(--surface2);
    border-radius: 100px;
    height: 4px;
    margin-bottom: 32px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    border-radius: 100px;
    transition: width 0.4s cubic-bezier(0.22,1,0.36,1);
  }

  .question-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .q-counter {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    background: rgba(124,109,247,0.12);
    border-radius: 100px;
    padding: 4px 12px;
  }

  .q-dots {
    display: flex;
    gap: 5px;
  }

  .q-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--surface2);
    border: 1px solid var(--border);
    transition: all 0.3s;
  }

  .q-dot.active { background: var(--accent); border-color: var(--accent); transform: scale(1.2); }
  .q-dot.done { background: rgba(124,109,247,0.4); border-color: transparent; }

  .question-text {
    font-size: clamp(17px, 2.5vw, 21px);
    font-weight: 700;
    line-height: 1.4;
    margin-bottom: 24px;
    letter-spacing: -0.01em;
  }

  .options-grid {
    display: grid;
    gap: 10px;
    margin-bottom: 28px;
  }

  .option-btn {
    width: 100%;
    text-align: left;
    background: var(--surface2);
    border: 1.5px solid var(--border);
    color: var(--text);
    border-radius: var(--radius);
    padding: 14px 18px;
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .option-btn:hover:not(:disabled) {
    background: rgba(124,109,247,0.1);
    border-color: var(--accent);
    transform: translateX(4px);
  }

  .option-btn.selected {
    border-color: var(--accent);
    background: rgba(124,109,247,0.15);
    box-shadow: 0 0 0 1px rgba(124,109,247,0.3);
  }

  .option-btn.correct-final {
    border-color: var(--correct);
    background: rgba(62,207,142,0.1);
    color: var(--correct);
  }

  .option-btn.wrong-final {
    border-color: var(--wrong);
    background: rgba(240,106,106,0.1);
    color: var(--wrong);
  }

  .option-btn:disabled { cursor: default; transform: none; }

  .option-letter {
    width: 28px;
    height: 28px;
    min-width: 28px;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
  }

  .option-btn.selected .option-letter { background: var(--accent); border-color: var(--accent); color: #fff; }
  .option-btn.correct-final .option-letter { background: var(--correct); border-color: var(--correct); color: #fff; }
  .option-btn.wrong-final .option-letter { background: var(--wrong); border-color: var(--wrong); color: #fff; }

  .nav-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--accent), #9a8bff);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    padding: 14px 28px;
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.01em;
  }

  .btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,109,247,0.35); }
  .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

  .btn-ghost {
    background: transparent;
    color: var(--muted);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 13px 20px;
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }

  /* Results */
  .results-hero {
    text-align: center;
    padding: 8px 0 32px;
  }

  .score-ring {
    width: 120px;
    height: 120px;
    margin: 0 auto 20px;
    position: relative;
  }

  .score-ring svg { transform: rotate(-90deg); }

  .score-ring-label {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 800;
    line-height: 1;
  }

  .score-ring-label small {
    font-size: 11px;
    color: var(--muted);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-top: 2px;
  }

  .results-title { font-size: 26px; font-weight: 800; margin-bottom: 6px; }
  .results-sub { color: var(--muted); font-size: 14px; margin-bottom: 28px; }

  .results-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; }

  .result-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
    background: var(--surface2);
    border: 1px solid var(--border);
    font-size: 13px;
    line-height: 1.4;
  }

  .result-item .ri-icon {
    width: 22px;
    height: 22px;
    min-width: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 900;
    margin-top: 1px;
  }

  .result-item.ri-ok .ri-icon { background: rgba(62,207,142,0.15); color: var(--correct); }
  .result-item.ri-bad .ri-icon { background: rgba(240,106,106,0.15); color: var(--wrong); }

  .ri-q { font-weight: 700; color: var(--text); }
  .ri-a { color: var(--muted); font-size: 12px; margin-top: 2px; }
  .ri-correct-label { color: var(--correct); font-size: 12px; }

  /* Loading / Error */
  .loading-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px 0;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .error-box {
    background: rgba(240,106,106,0.08);
    border: 1px solid rgba(240,106,106,0.25);
    border-radius: var(--radius);
    padding: 18px 20px;
    font-size: 14px;
    color: var(--wrong);
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .fade-in { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

  @media (max-width: 480px) {
    .card { padding: 28px 20px; border-radius: 20px; }
    .nav-row { flex-direction: column-reverse; }
    .nav-row .btn-primary, .nav-row .btn-ghost { width: 100%; text-align: center; }
  }
`;

const LETTERS = ["A", "B", "C", "D"];

export default function App() {
  const [phase, setPhase] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [submitting, setSubmitting] = useState(false);
  const [revealMode, setRevealMode] = useState(false);
  const [questionAnim, setQuestionAnim] = useState(true);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const loadQuestions = useCallback(async () => {
  setPhase("loading");
  try {
    const res = await fetch(`/api?action=listQuestion`);
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Neplatná odpověď ze serveru");
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    setQuestions(data);
    setPhase("start");
  } catch {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        setQuestions(parsed);
        setIsOffline(true);
        setPhase("start");
        return;
      }
    }
    setErrorMsg("Nepodařilo se načíst otázky. Zkontrolujte připojení k internetu.");
    setPhase("error");
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true;
    (async () => { if (active) await loadQuestions(); })();
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startQuiz = () => {
    // Vyber náhodné otázky a zamíchej odpovědi každé z nich
    const picked = pickRandom(questions, Math.min(5, questions.length)).map(shuffleOptions);
    setActiveQuestions(picked);
    setAnswers({});
    setResults([]);
    setCurrent(0);
    setRevealMode(false);
    setPhase("quiz");
  };

  const selectAnswer = (qId, optIdx) => {
    if (revealMode) return;
    setAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };

  const goNext = () => {
    setQuestionAnim(false);
    setTimeout(() => {
      setRevealMode(false);
      setCurrent(c => c + 1);
      setQuestionAnim(true);
    }, 150);
  };

  const goPrev = () => {
    setQuestionAnim(false);
    setTimeout(() => {
      setRevealMode(false);
      setCurrent(c => c - 1);
      setQuestionAnim(true);
    }, 150);
  };

  const submitAll = async () => {
  setSubmitting(true);
  const payload = activeQuestions.map(q => ({
    id: q.id,
    answer: q.optionMap[answers[q.id] ?? 0],
  }));

  // Offline – validuj lokálně (správná odpověď má vždy původní index 0)
  if (isOffline) {
    const localResults = activeQuestions.map(q => ({
      id: q.id,
      correct: q.optionMap[answers[q.id] ?? 0] === 0,
    }));
    setResults(localResults);
    setPhase("results");
    setSubmitting(false);
    return;
  }

  try {
    const res = await fetch(`/api?action=validationAnswer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    setResults(data);
    localStorage.setItem(RESULTS_KEY, JSON.stringify({ ts: Date.now(), results: data, questions: activeQuestions, answers }));
    setPhase("results");
  } catch {
    // Fetch selhal (ztráta spojení) – taky validuj lokálně
    const localResults = activeQuestions.map(q => ({
      id: q.id,
      correct: q.optionMap[answers[q.id] ?? 0] === 0,
    }));
    setResults(localResults);
    setPhase("results");
  } finally {
    setSubmitting(false);
  }
};

  const correctCount = results.filter(r => r.correct).length;
  const totalQ = activeQuestions.length;
  const pct = totalQ ? Math.round((correctCount / totalQ) * 100) : 0;
  const allAnswered = activeQuestions.length > 0 && activeQuestions.every(q => answers[q.id] !== undefined);

  const q = activeQuestions[current];

  const scoreColor = pct >= 80 ? "var(--correct)" : pct >= 50 ? "var(--accent2)" : "var(--wrong)";
  const circumference = 2 * Math.PI * 48;
  const dash = circumference - (pct / 100) * circumference;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="card">
          {isOffline && phase !== "loading" && (
            <div className="offline-badge">⚡ Offline režim – data z cache</div>
          )}

          {/* LOADING */}
          {phase === "loading" && (
            <div className="loading-wrap fade-in">
              <div className="spinner" />
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Načítám otázky…</p>
            </div>
          )}

          {/* ERROR */}
          {phase === "error" && (
            <div className="fade-in">
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
              <h1 style={{ fontSize: 24, marginBottom: 12 }}>Něco se pokazilo</h1>
              <div className="error-box">{errorMsg}</div>
              <button className="btn-primary" onClick={loadQuestions}>Zkusit znovu</button>
            </div>
          )}

          {/* START */}
          {phase === "start" && (
            <div className="fade-in">
              <div className="logo">skch.cz · kvíz</div>
              <h1>Otestuj své<br /><span>znalosti</span></h1>
              <p className="subtitle">
                Každé kolo dostaneš náhodný výběr {Math.min(5, questions.length)} otázek z celkového banku {questions.length} otázek.
                Odpovídej pečlivě – každá otázka se počítá.
              </p>
              <button className="btn-primary" onClick={startQuiz} style={{ width: "100%", padding: "16px" }}>
                Spustit kvíz →
              </button>
            </div>
          )}

          {/* QUIZ */}
          {phase === "quiz" && q && (
            <div className={questionAnim ? "fade-in" : ""} key={current}>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${((current + 1) / totalQ) * 100}%` }} />
              </div>

              <div className="question-meta">
                <span className="q-counter">Otázka {current + 1} / {totalQ}</span>
                <div className="q-dots">
                  {activeQuestions.map((_, i) => (
                    <div
                      key={i}
                      className={`q-dot${i === current ? " active" : i < current ? " done" : ""}`}
                    />
                  ))}
                </div>
              </div>

              <div className="question-text">{q.question}</div>

              <div className="options-grid">
                {q.options.map((opt, idx) => {
                  const isSelected = answers[q.id] === idx;
                  return (
                    <button
                      key={idx}
                      className={`option-btn${isSelected ? " selected" : ""}`}
                      onClick={() => selectAnswer(q.id, idx)}
                    >
                      <span className="option-letter">{LETTERS[idx]}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="nav-row">
                <button className="btn-ghost" onClick={goPrev} disabled={current === 0}>
                  ← Zpět
                </button>
                <div style={{ display: "flex", gap: 10 }}>
                  {current < totalQ - 1 ? (
                    <button className="btn-primary" onClick={goNext}>
                      Další →
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      onClick={submitAll}
                      disabled={!allAnswered || submitting}
                    >
                      {submitting ? "Odesílám…" : allAnswered ? "Vyhodnotit ✓" : `Zbývá ${Object.keys(answers).length}/${totalQ}`}
                    </button>
                  )}
                </div>
              </div>
              {!allAnswered && current === totalQ - 1 && (
                <p style={{ textAlign: "center", color: "var(--accent2)", fontSize: 12, marginTop: 12 }}>
                  Odpověz na všechny otázky, abys mohl/a odeslat kvíz.
                </p>
              )}
            </div>
          )}

          {/* RESULTS */}
          {phase === "results" && (
            <div className="fade-in">
              <div className="results-hero">
                <div className="score-ring">
                  <svg viewBox="0 0 110 110" width="120" height="120">
                    <circle cx="55" cy="55" r="48" fill="none" stroke="var(--surface2)" strokeWidth="8" />
                    <circle
                      cx="55" cy="55" r="48"
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dash}
                      style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
                    />
                  </svg>
                  <div className="score-ring-label">
                    <span style={{ color: scoreColor }}>{pct}%</span>
                    <small>skóre</small>
                  </div>
                </div>
                <div className="results-title">
                  {pct === 100 ? "Perfektní!" : pct >= 80 ? "Výborně!" : pct >= 50 ? "Dobrá práce" : "Zkus to znovu"}
                </div>
                <div className="results-sub">
                  {correctCount} z {totalQ} správně · {100 - pct}% chyb
                </div>
              </div>

              <div className="results-list">
                {activeQuestions.map((aq, qi) => {
                  const r = results.find(x => x.id === aq.id);
                  const isOk = r?.correct;
                  const userAns = answers[aq.id];
                  // Správná odpověď = ta, jejíž původní index byl 0
                  const correctShuffledIdx = aq.optionMap.indexOf(0);
                  return (
                    <div key={aq.id} className={`result-item ${isOk ? "ri-ok" : "ri-bad"}`}>
                      <div className="ri-icon">{isOk ? "✓" : "✗"}</div>
                      <div>
                        <div className="ri-q">{qi + 1}. {aq.question}</div>
                        <div className="ri-a">
                          Tvá odpověď: <strong>{aq.options[userAns]}</strong>
                          {!isOk && (
                            <span className="ri-correct-label"> · Správně: {aq.options[correctShuffledIdx]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-ghost" onClick={loadQuestions} style={{ flex: 1 }}>Nové otázky</button>
                <button className="btn-primary" onClick={startQuiz} style={{ flex: 2 }}>Hrát znovu →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}