import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

const ANSWER_YES_VALUE = "SA-";
const ANSWER_NO_VALUE = "No";
const EVENT_ID = "boda-marielos-guillermo-2025";
const RSVP_DEADLINE_TS = Date.parse("2025-11-16T06:00:00Z");
const RSVP_DEADLINE_LABEL = "15 de noviembre de 2025";

const isDeadlinePassed = () => Date.now() >= RSVP_DEADLINE_TS;

async function generateEntryHash({ token, members, extras = [], timestamp }) {
  const payload = JSON.stringify({
    event: EVENT_ID,
    token: token || null,
    timestamp,
    members,
    extras,
  });

  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  return payload;
}

const normalizeAnswer = (value) => {
  if (value == null) return "";
  const base = String(value).trim();
  const simplified = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (["si", "sa-", "yes", "y"].includes(simplified)) return "Sí";
  if (["no", "n"].includes(simplified)) return "No";
  return base;
};

const parseStoredNote = (noteValue) => {
  if (noteValue == null || noteValue === "") return {};
  if (typeof noteValue === "string") {
    try {
      return JSON.parse(noteValue);
    } catch {
      return { comment: noteValue };
    }
  }
  if (typeof noteValue === "object") return noteValue;
  return {};
};

const statusToSummary = (status, fallbackName = "") => {
  const parsed = parseStoredNote(status.note);
  let members = Array.isArray(parsed.members)
    ? parsed.members.map((member) => ({
        name: member?.name || fallbackName || "",
        answer: normalizeAnswer(member?.answer),
      }))
    : [];

  if (!members.length && status.name) {
    members = [
      { name: status.name, answer: normalizeAnswer(status.answer) },
    ];
  } else if (!members.length && fallbackName) {
    members = [
      { name: fallbackName, answer: normalizeAnswer(status.answer) },
    ];
  }

  const extras = Array.isArray(parsed.extras) ? parsed.extras : [];
  const comment =
    typeof parsed.comment === "string" && parsed.comment.trim()
      ? parsed.comment.trim()
      : typeof status.note === "string" && !parsed.members
      ? status.note
      : null;

  const confirmedMembers = members.filter(
    (member) => normalizeAnswer(member.answer) === "Sí"
  ).length;

  const guests =
    typeof status.guests === "number"
      ? status.guests
      : confirmedMembers + extras.length;

  const confirmedTotal = confirmedMembers + extras.length;

  return {
    type: members.length > 1 ? "grupo" : "individual",
    submittedAt: status.receivedAt || status.timestamp || null,
    note: comment,
    guests,
    confirmed: confirmedTotal,
    confirmedMembers,
    members,
    extras,
    hash: status.entryHash || null,
  };
};

const formatDateTime = (isoString) => {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    return date.toLocaleString("es-GT", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
};

export default function RSVP() {
  const router = useRouter();
  const { p, n } = router.query;

  const [displayName, setDisplayName] = useState("");
  const [answer, setAnswer] = useState("");
  const [guests, setGuests] = useState(0);
  const [note, setNote] = useState("");

  const [party, setParty] = useState(null);
  const [memberAnswers, setMemberAnswers] = useState([]);
  const [extraNames, setExtraNames] = useState([]);

  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deadlinePassed, setDeadlinePassed] = useState(() => isDeadlinePassed());
  const [existingStatus, setExistingStatus] = useState(null);

  useEffect(() => {
    const invitedName = n ? decodeURIComponent(n) : "";
    if (invitedName && !displayName) {
      setDisplayName(invitedName);
    }

    async function init() {
      if (!p) return;
      try {
        const response = await fetch(`/api/party?token=${encodeURIComponent(p)}`);
        const json = await response.json();

        if (json?.ok && json.party) {
          const members = Array.isArray(json.party.members)
            ? json.party.members.filter(Boolean)
            : [];

          setParty(json.party);
          setDisplayName(json.party.displayName || invitedName || "Invitado/a");
          setMemberAnswers(members.map((name) => ({ name, answer: "" })));
          setExtraNames(
            Array.from({ length: json.party.allowedExtra || 0 }, () => "")
          );
        }
      } catch (err) {
        console.error("No se pudo cargar el grupo", err);
      }
    }

    init();
  }, [p, n, displayName]);

  useEffect(() => {
    if (!p) {
      setStatusLoading(false);
      return;
    }
    if (existingStatus) {
      setStatusLoading(false);
      return;
    }

    let cancelled = false;
    setStatusLoading(true);

    async function fetchStatus() {
      try {
        const response = await fetch(
          `/api/rsvp-status?token=${encodeURIComponent(p)}`
        );
        const json = await response.json();
        if (cancelled) return;
        if (json?.ok && json.status) {
          const summary = statusToSummary(
            json.status,
            json.status?.name || displayName || "Invitado/a"
          );
          setExistingStatus(summary);
          setSent(true);
          setError("");
          if (Array.isArray(summary.extras)) {
            setExtraNames(summary.extras);
          }
        }
      } catch (err) {
        console.error("No se pudo cargar el estado de RSVP", err);
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    }

    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [p, existingStatus, displayName]);

  useEffect(() => {
    if (deadlinePassed || existingStatus) return;
    const id = window.setInterval(() => {
      if (isDeadlinePassed()) {
        setDeadlinePassed(true);
        window.clearInterval(id);
      }
    }, 60000);
    return () => window.clearInterval(id);
  }, [deadlinePassed, existingStatus]);

  const allMarked = useMemo(() => {
    if (!party) return true;
    return memberAnswers.every(
      (member) => member.answer === ANSWER_YES_VALUE || member.answer === ANSWER_NO_VALUE
    );
  }, [party, memberAnswers]);

  const setAnswerFor = (index, value) => {
    setMemberAnswers((prev) =>
      prev.map((member, i) => (i === index ? { ...member, answer: value } : member))
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (statusLoading) {
      setError("Estamos verificando una confirmación previa. Intenta nuevamente en unos segundos.");
      return;
    }

    if (deadlinePassed) {
      setError(`Cerramos confirmaciones el ${RSVP_DEADLINE_LABEL}.`);
      return;
    }

    if (existingStatus) {
      setError("Ya registramos tu confirmación previamente.");
      return;
    }

    if (!displayName.trim()) {
      setError("Por favor escribe el nombre del invitado o grupo.");
      return;
    }

    if (party && !allMarked) {
      setError("Selecciona una respuesta para cada persona invitada.");
      return;
    }

    if (!party && !answer) {
      setError("Indica si podrás acompañarnos.");
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date().toISOString();
      const trimmedNote = note.trim();

      const rows = [];

      let submissionSummary = null;

      if (party) {
        const extrasFilled = extraNames
          .map((name) => name.trim())
          .filter((name) => name.length > 0);

        const confirmedCount = memberAnswers.filter(
          (member) => member.answer === ANSWER_YES_VALUE
        ).length;

        const normalizedMembers = memberAnswers.map((member) => ({
          name: member.name,
          answer: member.answer === ANSWER_YES_VALUE ? "Sí" : member.answer === ANSWER_NO_VALUE ? "No" : member.answer,
        }));
        const entryHash = await generateEntryHash({
          token: p,
          members: normalizedMembers,
          extras: extrasFilled,
          timestamp: now,
        });

        rows.push({
          token: p || null,
          name: displayName.trim(),
          answer: "grupo",
          guests: confirmedCount + extrasFilled.length,
          note: JSON.stringify({
            members: normalizedMembers,
            extras: extrasFilled,
            comment: trimmedNote || null,
          }),
          receivedAt: now,
          entryHash,
        });

        submissionSummary = {
          type: "grupo",
          submittedAt: now,
          note: trimmedNote || null,
          guests: confirmedCount + extrasFilled.length,
          confirmed: confirmedCount + extrasFilled.length,
          confirmedMembers: confirmedCount,
          members: normalizedMembers,
          extras: extrasFilled,
          hash: entryHash,
        };
      } else {
        const normalizedMembers = [
          {
            name: displayName.trim(),
            answer: answer === ANSWER_YES_VALUE ? "Sí" : answer,
          },
        ];
        const entryHash = await generateEntryHash({
          token: p,
          members: normalizedMembers,
          timestamp: now,
        });
        rows.push({
          token: p || null,
          name: displayName.trim(),
          answer,
          guests,
          note: trimmedNote,
          receivedAt: now,
          entryHash,
        });

        submissionSummary = {
          type: "individual",
          submittedAt: now,
          note: trimmedNote || null,
          guests,
          confirmed: guests,
          confirmedMembers: normalizedMembers.filter((member) => member.answer === "Sí").length,
          members: normalizedMembers,
          hash: entryHash,
        };
      }

      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      if (response.status === 409) {
        const data = await response.json().catch(() => null);
        const summary = data?.status
          ? statusToSummary(data.status, displayName || "Invitado/a")
          : null;
        if (summary) {
          setExistingStatus(summary);
          setSent(true);
          setError("");
          if (Array.isArray(summary.extras)) {
            setExtraNames(summary.extras);
          }
        } else {
          setError("Ya registramos tu confirmación previamente.");
        }
        setStatusLoading(false);
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "No pudimos registrar tu respuesta.");
      }

      if (submissionSummary) {
        setExistingStatus(submissionSummary);
      }
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (statusLoading && !sent && !existingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
        <div className="bg-white shadow-xl rounded-xl p-8 text-center space-y-3 max-w-md">
          <h1 className="h-font text-2xl font-semibold text-center gold-gradient">
            Consultando confirmación...
          </h1>
          <p className="text-sm text-gray-600">
            Estamos verificando si ya registraste tu respuesta. Por favor espera unos segundos.
          </p>
        </div>
      </div>
    );
  }

  if (sent) {
    const summary = existingStatus;
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
        <div className="bg-white shadow-xl rounded-xl p-8 text-center space-y-3 max-w-md">
          <h1 className="h-font text-2xl font-semibold text-center gold-gradient">
            ¡Gracias por confirmar!
          </h1>
          {summary?.submittedAt ? (
            <p className="text-sm text-gray-600">
              Registramos tu respuesta el {formatDateTime(summary.submittedAt) || "día indicado"}.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Registramos tu respuesta y pronto te enviaremos más detalles.
            </p>
          )}
          {summary?.members?.length ? (
            <div className="text-sm text-gray-700 border rounded-lg p-4 text-left">
              {summary.members.map((member) => (
                <div key={member.name}>
                  <strong>{member.name}</strong>: {normalizeAnswer(member.answer) || "—"}
                </div>
              ))}
            </div>
          ) : null}
          {summary?.extras?.length ? (
            <div className="text-sm text-gray-600">
              Acompañantes extra:
              {summary.extras.map((extra, index) => (
                <div key={`${extra}-${index}`}>{extra}</div>
              ))}
            </div>
          ) : null}
          {summary?.note && (
            <p className="text-sm text-gray-600">
              Nota: {summary.note}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (existingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
        <div className="bg-white shadow-xl rounded-xl p-8 text-center space-y-3 max-w-md">
          <h1 className="h-font text-2xl font-semibold text-center gold-gradient">
            Ya registramos tu confirmación
          </h1>
          <p className="text-sm text-gray-600">
            Si necesitas actualizar datos, contáctanos directamente para apoyarte.
          </p>
        </div>
      </div>
    );
  }

  if (deadlinePassed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
        <div className="bg-white shadow-xl rounded-xl p-8 text-center space-y-2 max-w-md">
          <h1 className="h-font text-2xl font-semibold text-center gold-gradient">
            RSVP cerrado
          </h1>
          <p className="text-sm text-gray-600">
            Cerramos confirmaciones el {RSVP_DEADLINE_LABEL}. Si necesitas comunicar algo,
            por favor contáctanos directamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-xl p-8 space-y-5 w-full max-w-md"
      >
        <h1
          className="h-font text-2xl font-semibold text-center gold-gradient"
          style={{ WebkitTextFillColor: "transparent" }}
        >
          Confirma tu asistencia
        </h1>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nombre del invitado o grupo
          </label>
          <input
            className="border border-gray-300 p-2 w-full rounded mt-1 focus:outline-none focus:ring-2 focus:ring-rose-200"
            value={displayName}
            readOnly={Boolean(party)}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </div>

        {party ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona la respuesta de cada persona
              </label>
              <div className="space-y-3">
                {memberAnswers.map((member, index) => {
                  const isYes = member.answer === ANSWER_YES_VALUE;
                  const isNo = member.answer === ANSWER_NO_VALUE;

                  return (
                    <div
                      key={member.name || index}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="text-base text-gray-900">
                        {member.name}
                      </span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setAnswerFor(index, ANSWER_YES_VALUE)}
                          className={`px-5 py-2 rounded border transition ${
                            isYes
                              ? "bg-emerald-600 border-emerald-600 text-white shadow"
                              : "bg-white border-gray-300 text-gray-700"
                          }`}
                          aria-pressed={isYes}
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnswerFor(index, ANSWER_NO_VALUE)}
                          className={`px-5 py-2 rounded border transition ${
                            isNo
                              ? "bg-gray-200 border-gray-300 text-gray-800"
                              : "bg-white border-gray-300 text-gray-700"
                          }`}
                          aria-pressed={isNo}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {extraNames.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Acompañantes extra (opcional)
                </label>
                {extraNames.map((value, index) => (
                  <input
                    key={`extra-${index}`}
                    className="border border-gray-300 p-2 w-full rounded mt-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    placeholder={`Nombre del acompañante ${index + 1}`}
                    value={value}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setExtraNames((prev) =>
                        prev.map((name, i) => (i === index ? nextValue : name))
                      );
                    }}
                  />
                ))}
                <p className="text-xs text-gray-500 mt-2">
                  Déjalo en blanco si no utilizarás los lugares extra.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nota o preferencias
              </label>
              <textarea
                className="border border-gray-300 p-2 w-full rounded mt-1 focus:outline-none focus:ring-2 focus:ring-rose-200"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2 rounded text-white transition ${
                allMarked && !submitting
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-emerald-600 opacity-60 cursor-not-allowed"
              }`}
              disabled={statusLoading || !allMarked || submitting}
            >
              {submitting ? "Enviando..." : "Confirmar asistencia"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                ¿Podrás asistir?
              </label>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAnswer(ANSWER_YES_VALUE)}
                  className={`px-4 py-2 rounded border transition ${
                    answer === ANSWER_YES_VALUE
                      ? "bg-emerald-600 border-emerald-600 text-white shadow"
                      : "bg-white border-gray-300 text-gray-700"
                  }`}
                  aria-pressed={answer === ANSWER_YES_VALUE}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setAnswer(ANSWER_NO_VALUE)}
                  className={`px-4 py-2 rounded border transition ${
                    answer === ANSWER_NO_VALUE
                      ? "bg-gray-200 border-gray-300 text-gray-800"
                      : "bg-white border-gray-300 text-gray-700"
                  }`}
                  aria-pressed={answer === ANSWER_NO_VALUE}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Acompañantes adicionales (además de ti)
              </label>
              <input
                type="number"
                min="0"
                className="border border-gray-300 p-2 w-28 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-rose-200"
                value={guests}
                onChange={(event) => setGuests(Number(event.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nota o preferencias
              </label>
              <textarea
                className="border border-gray-300 p-2 w-full rounded mt-1 focus:outline-none focus:ring-2 focus:ring-rose-200"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2 rounded text-white transition ${
                answer && !submitting
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-emerald-600 opacity-60 cursor-not-allowed"
              }`}
              disabled={statusLoading || !answer || submitting}
            >
              {submitting ? "Enviando..." : "Confirmar asistencia"}
            </button>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </div>
  );
}
