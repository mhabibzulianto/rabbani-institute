"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatExamDateTime, formatRemainingSeconds, minutesToExamDurationLabel } from "@/lib/exam-utils";

const storagePrefix = "rabbani-exam-access";

export default function ExamPortal({ exam }) {
  const storageKey = `${storagePrefix}:${exam.slug}`;
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [sessionData, setSessionData] = useState(null);
  const [attemptData, setAttemptData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!attemptData?.attempt?.expires_at) {
      setTimeLeft(null);
      return undefined;
    }

    const updateTimer = () => {
      const ms = new Date(attemptData.attempt.expires_at).getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(ms / 1000)));
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [attemptData]);

  const remainingAttempts = sessionData?.remaining_attempts ?? attemptData?.remaining_attempts ?? exam.max_attempts;
  const attemptSummary = attemptData?.result || sessionData?.latest_result || null;
  const questionList = attemptData?.questions || [];
  const canStart = remainingAttempts > 0 && !sessionData?.active_attempt && !attemptData?.attempt;
  const canResume = Boolean(sessionData?.active_attempt) && !attemptData?.attempt;

  const clearAccess = useCallback(() => {
    window.sessionStorage.removeItem(storageKey);
    setAccessToken("");
    setSessionData(null);
    setAttemptData(null);
    setAnswers({});
    setStep("phone");
  }, [storageKey]);

  const loadSession = useCallback(async (token = accessToken) => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/exams/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSlug: exam.slug,
          accessToken: token,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Sesi ujian tidak ditemukan.");
      }

      setSessionData(payload);
      if (payload.active_attempt) {
        setAttemptData(null);
      }
    } catch (caughtError) {
      setError(caughtError.message);
      clearAccess();
    } finally {
      setLoading(false);
    }
  }, [accessToken, clearAccess, exam.slug]);

  const submitAttempt = useCallback(async (isAutomatic = false) => {
    if (!attemptData?.attempt?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSlug: exam.slug,
          accessToken,
          attemptId: attemptData.attempt.id,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Ujian tidak bisa disubmit.");
      }

      setAttemptData((current) => ({
        ...current,
        result: payload.result,
        remaining_attempts: payload.remaining_attempts,
        attempt: null,
      }));
      setSessionData((current) => ({
        ...(current || {}),
        active_attempt: null,
        latest_result: payload.result,
        remaining_attempts: payload.remaining_attempts,
      }));
      setMessage(isAutomatic ? "Waktu ujian habis. Jawaban yang sempat tersimpan sudah dikirim." : "Jawaban ujian berhasil dikirim.");
      setTimeLeft(null);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, attemptData, exam.slug]);

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem(storageKey);

    if (!savedToken) {
      return;
    }

    setAccessToken(savedToken);
    setStep("session");
    void loadSession(savedToken);
  }, [loadSession, storageKey]);

  useEffect(() => {
    if (timeLeft !== 0 || !attemptData?.attempt?.id) {
      return;
    }

    void submitAttempt(true);
  }, [timeLeft, attemptData, submitAttempt]);

  async function sendOtp() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/exams/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSlug: exam.slug,
          phone,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Gagal mengirim OTP.");
      }

      setMessage(`Kode OTP sudah dikirim ke WhatsApp ${payload.phone}.`);
      setStep("otp");
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/exams/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSlug: exam.slug,
          phone,
          code: otp,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "OTP tidak valid.");
      }

      window.sessionStorage.setItem(storageKey, payload.access_token);
      setAccessToken(payload.access_token);
      setMessage("Verifikasi berhasil. Kamu bisa mulai ujian sekarang.");
      setStep("session");
      await loadSession(payload.access_token);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }

  async function startAttempt() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/exams/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSlug: exam.slug,
          accessToken,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Tidak bisa memulai ujian.");
      }

      const normalizedPayload = {
        ...payload,
        questions: (payload.questions || []).map(normalizeQuestion),
      };
      const initialAnswers = Object.fromEntries(
        (normalizedPayload.attempt.answers || []).map((answer) => [answer.question_id, answer.selected_option]),
      );

      setAnswers(initialAnswers);
      setAttemptData(normalizedPayload);
      setSessionData((current) => ({
        ...(current || {}),
        active_attempt: normalizedPayload.attempt,
        remaining_attempts: normalizedPayload.remaining_attempts,
      }));
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveAnswer(questionId, responseValue) {
    const nextAnswers = {
      ...answers,
      [questionId]: responseValue,
    };
    setAnswers(nextAnswers);

    try {
      const response = await fetch("/api/exams/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSlug: exam.slug,
          accessToken,
          attemptId: attemptData.attempt.id,
          questionId,
          response: responseValue,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Jawaban tidak bisa disimpan.");
      }
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  function toggleMultipleChoice(questionId, optionKey, checked) {
    const current = Array.isArray(answers[questionId]) ? answers[questionId] : [];
    const next = checked
      ? Array.from(new Set([...current, optionKey]))
      : current.filter((item) => item !== optionKey);
    void saveAnswer(questionId, next);
  }

  function updateGridChoice(questionId, rowKey, optionKey) {
    const current = answers[questionId] && typeof answers[questionId] === "object" && !Array.isArray(answers[questionId])
      ? answers[questionId]
      : {};
    void saveAnswer(questionId, {
      ...current,
      [rowKey]: optionKey,
    });
  }

  const statusLabel = useMemo(() => {
    if (new Date(exam.opens_at).getTime() > Date.now()) {
      return "Belum dibuka";
    }

    if (new Date(exam.closes_at).getTime() < Date.now()) {
      return "Sudah ditutup";
    }

    return "Sedang dibuka";
  }, [exam]);

  return (
    <section className="exam-portal panel">
      <div className="exam-portal-header">
        <div>
          <p className="section-label">Modul ujian</p>
          <h2>{exam.title}</h2>
          <p>{exam.subtitle || exam.description || "Modul ujian khusus di luar course reguler."}</p>
        </div>
        <div className="exam-status-stack">
          <span className="pill">{statusLabel}</span>
          <span className="muted-line">Durasi: {minutesToExamDurationLabel(exam.duration_minutes)}</span>
          <span className="muted-line">Maksimal attempt: {exam.max_attempts}</span>
        </div>
      </div>

      <div className="exam-info-grid">
        <div className="panel exam-info-card">
          <strong>Jadwal ujian</strong>
          <p>{formatExamDateTime(exam.opens_at)} sampai {formatExamDateTime(exam.closes_at)}</p>
        </div>
        <div className="panel exam-info-card">
          <strong>Soal tersedia</strong>
          <p>{exam.question_count} soal pilihan ganda</p>
        </div>
      </div>

      {exam.instructions ? (
        <div className="exam-instructions">
          <strong>Instruksi</strong>
          <p>{exam.instructions}</p>
        </div>
      ) : null}

      {error ? <p className="notice error">{error}</p> : null}
      {message ? <p className="notice success">{message}</p> : null}

      {step === "phone" ? (
        <div className="exam-access-card">
          <label>
            Nomor WhatsApp
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Contoh: 6281234567890"
            />
          </label>
          <p className="field-note">
            Masukkan nomor WhatsApp aktif. Jika admin mengisi whitelist, hanya nomor yang sudah didaftarkan yang bisa menerima OTP.
          </p>
          <button className="button primary" type="button" onClick={sendOtp} disabled={loading || !phone}>
            {loading ? "Mengirim..." : "Kirim OTP ujian"}
          </button>
        </div>
      ) : null}

      {step === "otp" ? (
        <div className="exam-access-card">
          <p>Kode OTP sudah dikirim ke {phone}. Masukkan 6 digit kode untuk melanjutkan.</p>
          <label>
            Kode OTP
            <input
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6 digit"
              maxLength={6}
            />
          </label>
          <div className="hero-actions">
            <button className="button primary" type="button" onClick={verifyOtp} disabled={loading || otp.length !== 6}>
              {loading ? "Memverifikasi..." : "Verifikasi OTP"}
            </button>
            <button className="button secondary" type="button" onClick={() => setStep("phone")}>
              Ganti nomor
            </button>
          </div>
        </div>
      ) : null}

      {step === "session" ? (
        <div className="exam-session-stack">
          <div className="exam-access-card">
            <strong>Nomor terverifikasi</strong>
            <p>{sessionData?.phone_display || phone}</p>
            <p className="muted-line">Sisa attempt: {remainingAttempts}</p>
            <div className="hero-actions">
              {canResume ? (
                <button className="button primary" type="button" onClick={startAttempt} disabled={loading}>
                  {loading ? "Membuka..." : "Lanjutkan attempt aktif"}
                </button>
              ) : null}
              {canStart ? (
                <button className="button primary" type="button" onClick={startAttempt} disabled={loading}>
                  {loading ? "Menyiapkan..." : "Mulai ujian"}
                </button>
              ) : null}
              <button className="button secondary" type="button" onClick={clearAccess}>
                Keluar dari sesi ujian
              </button>
            </div>
          </div>

          {attemptSummary ? (
            <div className="panel exam-summary-card">
              <strong>Hasil attempt terakhir</strong>
              <p>Attempt #{attemptSummary.attempt_number}</p>
              <p>Skor: {attemptSummary.score_percent}% ({attemptSummary.correct_answers}/{attemptSummary.total_questions} benar)</p>
              <p className="muted-line">Dikirim pada {formatExamDateTime(attemptSummary.submitted_at)}</p>
            </div>
          ) : null}

          {attemptData?.attempt ? (
            <div className="exam-attempt-shell">
              <div className="exam-timer-row">
                <div>
                  <strong>Attempt #{attemptData.attempt.attempt_number}</strong>
                  <p className="muted-line">Waktu berakhir pada {formatExamDateTime(attemptData.attempt.expires_at)}</p>
                </div>
                <div className="exam-timer-box">
                  <span>Timer ujian</span>
                  <strong>{formatRemainingSeconds(timeLeft || 0)}</strong>
                </div>
              </div>

              <div className="exam-question-list">
                {questionList.map((question, index) => (
                  <article className="panel exam-question-card" key={question.id}>
                    <div className="exam-question-head">
                      <strong>Soal {index + 1}</strong>
                      <span className="muted-line">{question.points || 1} poin</span>
                    </div>
                    <p>{question.prompt}</p>
                    {question.question_type === "multiple_choice" ? (
                      <div className="exam-option-list">
                        {question.options.map((option) => (
                          <label className="exam-option" key={option.key}>
                            <input
                              type="checkbox"
                              checked={Array.isArray(answers[question.id]) && answers[question.id].includes(option.key)}
                              onChange={(event) => toggleMultipleChoice(question.id, option.key, event.target.checked)}
                            />
                            <span>
                              <strong>{option.key.toUpperCase()}.</strong> {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : null}

                    {question.question_type === "grid_single" ? (
                      <div className="exam-grid-table">
                        <div className="exam-grid-head">
                          <span />
                          {question.grid_columns.map((column) => (
                            <strong key={column.key}>{column.label}</strong>
                          ))}
                        </div>
                        {question.grid_rows.map((row) => (
                          <div className="exam-grid-row" key={row.key}>
                            <span>{row.label}</span>
                            {question.grid_columns.map((column) => (
                              <label className="exam-grid-cell" key={`${row.key}-${column.key}`}>
                                <input
                                  type="radio"
                                  name={`question-${question.id}-${row.key}`}
                                  checked={answers[question.id]?.[row.key] === column.key}
                                  onChange={() => updateGridChoice(question.id, row.key, column.key)}
                                />
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {question.question_type === "single_choice" ? (
                      <div className="exam-option-list">
                        {question.options.map((option) => (
                          <label className="exam-option" key={option.key}>
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              checked={answers[question.id] === option.key}
                              onChange={() => saveAnswer(question.id, option.key)}
                            />
                            <span>
                              <strong>{option.key.toUpperCase()}.</strong> {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className="hero-actions">
                <button className="button primary" type="button" onClick={() => submitAttempt(false)} disabled={loading}>
                  {loading ? "Mengirim..." : "Kirim jawaban ujian"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function normalizeQuestion(question) {
  const optionList = Array.isArray(question.option_list)
    ? question.option_list
    : [
        { key: "a", label: question.option_a },
        { key: "b", label: question.option_b },
        { key: "c", label: question.option_c },
        { key: "d", label: question.option_d },
      ]
        .filter((option) => option.label)
        .map((option) => ({ ...option, key: String(option.key) }));
  const gridRows = Array.isArray(question.grid_rows) ? question.grid_rows : [];
  const gridColumns = Array.isArray(question.grid_columns) ? question.grid_columns : [];

  return {
    ...question,
    question_type: question.question_type || "single_choice",
    options: optionList,
    grid_rows: gridRows,
    grid_columns: gridColumns,
  };
}
