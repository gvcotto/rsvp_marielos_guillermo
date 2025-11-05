import { useEffect, useMemo, useState } from "react";

const ANSWER_YES_VALUE = "yes";
const ANSWER_NO_VALUE = "no";
const ANSWER_YES_LABEL = "Sí";
const ANSWER_NO_LABEL = "No";
const EVENT_ID = "boda-marielos-guillermo-2025";
const RSVP_DEADLINE_TS = Date.parse("2025-11-16T06:00:00Z");
const RSVP_DEADLINE_LABEL = "15 de noviembre de 2025";

const isDeadlinePassed = () => Date.now() >= RSVP_DEADLINE_TS;

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

export default function RSVPInline({
  token,
  fallbackName,
  initialStatus = null,
  onConfirmed = () => {},
}) {
  const [members, setMembers] = useState([]);
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState("");
  const [extraSlots, setExtraSlots] = useState(
    initialStatus?.extras ? initialStatus.extras.length : 0
  );
  const [extraNames, setExtraNames] = useState(
    initialStatus?.extras ? [...initialStatus.extras] : []
  );
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(
    Boolean(token) && !initialStatus
  );
  const [ok, setOk] = useState(Boolean(initialStatus));
  const [error, setError] = useState("");
  const [deadlinePassed, setDeadlinePassed] = useState(() => isDeadlinePassed());
  const [existingStatus, setExistingStatus] = useState(initialStatus);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      if (!token) {
        const name = (fallbackName || "Invitado/a").trim();
        if (!cancelled) {
          setMembers([name]);
          setAnswers((prev) => ({ ...prev, [name]: prev[name] || "" }));
          if (!initialStatus) {
            setExtraSlots(0);
            setExtraNames([]);
          }
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/party?token=${encodeURIComponent(token)}`
        );
        const json = await response.json();
        if (cancelled) return;

        if (json?.ok && json.party) {
          const cleanMembers = Array.isArray(json.party.members)
            ? json.party.members.filter(Boolean)
            : [];

          const fallbackDisplayName =
            json.party.displayName?.trim() || fallbackName || "Invitado/a";

            const allowedExtra = Number(json.party.allowedExtra || 0);
            if (!initialStatus) {
              setExtraSlots(allowedExtra > 0 ? allowedExtra : 0);
              setExtraNames(Array.from({ length: allowedExtra }, () => ""));
            }

            const list = cleanMembers.length ? cleanMembers : [fallbackDisplayName];

            setMembers(list);
            setAnswers((prev) => {
              const next = { ...prev };
              list.forEach((name) => {
              next[name] = prev[name] || "";
            });
            return next;
          });
        } else {
          throw new Error("Respuesta inválida del servidor.");
        }
      } catch (err) {
        console.error("No se pudo cargar el grupo", err);
        if (!cancelled) {
          setError(
            "No pudimos cargar la lista de invitados. Intenta nuevamente en unos minutos."
          );
        }
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [token, fallbackName]);

  useEffect(() => {
    if (!token) {
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
          `/api/rsvp-status?token=${encodeURIComponent(token)}`
        );
        const json = await response.json();
        if (cancelled) return;
        if (json?.ok && json.status) {
          const summary = statusToSummary(json.status, fallbackName);
          setExistingStatus(summary);
          if (Array.isArray(summary.extras)) {
            setExtraSlots(summary.extras.length);
            setExtraNames(summary.extras);
          }
          setOk(true);
          setError("");
          onConfirmed(summary);
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
  }, [token, existingStatus, fallbackName, onConfirmed]);

  useEffect(() => {
    if (initialStatus) {
      setExistingStatus(initialStatus);
      setOk(true);
      setError("");
      if (Array.isArray(initialStatus.extras)) {
        setExtraSlots(initialStatus.extras.length);
        setExtraNames(initialStatus.extras);
      }
      setStatusLoading(false);
    }
  }, [initialStatus]);

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

  const allSelected = useMemo(() => {
    if (!members.length) return false;
    return members.every((name) => Boolean(answers[name]));
  }, [members, answers]);

  const setAnswer = (name, value) => {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
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

    if (!allSelected) {
      setError("Selecciona una opción para cada invitado.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const now = new Date().toISOString();
      const cleanedNote = note.trim();
      const normalizedMembers = members.map((name) => ({
        name,
        answer: answers[name] || "",
      }));

      const toReadableAnswer = (value) => {
        if (value === ANSWER_YES_VALUE) return "Sí";
        if (value === ANSWER_NO_VALUE) return "No";
        return value;
      };

      const sheetMembers = normalizedMembers.map((member) => ({
        name: member.name,
        answer: toReadableAnswer(member.answer),
      }));

      const extrasFilled = extraNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      const extrasCount = extrasFilled.length;

      const confirmedCount = sheetMembers.filter(
        (member) => member.answer === "Sí"
      ).length;

      const notePayload = {
        members: sheetMembers,
        extras: extrasFilled,
        comment: cleanedNote || "",
      };

      let payload;
      let extrasForSummary = extrasFilled;

      if (sheetMembers.length > 1) {
        payload = {
          token: token || null,
          name: (fallbackName || sheetMembers[0]?.name || "Invitado/a").trim(),
          answer: "grupo",
          guests: confirmedCount + extrasCount,
          note: JSON.stringify(notePayload),
          receivedAt: now,
        };
      } else {
        const member = sheetMembers[0];
        const baseGuest = member?.answer === "Sí" ? 1 : 0;
        payload = {
          token: token || null,
          name: member?.name || (fallbackName || "Invitado/a").trim(),
          answer: member?.answer || "",
          guests: baseGuest + extrasCount,
          note: JSON.stringify(notePayload),
          receivedAt: now,
        };
      }

      const entryHash = await generateEntryHash({
        token,
        members: sheetMembers,
        extras: extrasFilled,
        timestamp: now,
      });
      payload.entryHash = entryHash;

      const totalGuests = sheetMembers.length > 1
        ? confirmedCount + extrasForSummary.length
        : payload.guests || 0;

      const summary = {
        type: sheetMembers.length > 1 ? "grupo" : "individual",
        submittedAt: now,
        note: cleanedNote || null,
        guests: totalGuests,
        confirmed: totalGuests,
        confirmedMembers: confirmedCount,
        members: sheetMembers,
        extras: extrasForSummary,
        hash: entryHash,
      };

      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 409) {
        const data = await response.json().catch(() => null);
        const summary = data?.status
          ? statusToSummary(data.status, fallbackName || "Invitado/a")
          : null;
        if (summary) {
          setExistingStatus(summary);
          setOk(true);
          setError("");
          if (Array.isArray(summary.extras)) {
            setExtraSlots(summary.extras.length);
            setExtraNames([...summary.extras]);
          }
          onConfirmed(summary);
        } else {
          setError("Ya registramos tu confirmación previamente.");
        }
        setStatusLoading(false);
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "No pudimos registrar la confirmación.");
      }

      setOk(true);
      setExistingStatus(summary);
      onConfirmed(summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (statusLoading && !existingStatus) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div className="sec-title">Consultando confirmación...</div>
        <div className="sec-text">
          Estamos verificando si ya registraste tu respuesta. Por favor espera unos segundos.
        </div>
      </div>
    );
  }

  if (ok) {
    const summary = existingStatus;
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div className="sec-title">¡Gracias por confirmar!</div>
        <div className="sec-text">
          {summary?.submittedAt
            ? `Registramos tu respuesta el ${
                formatDateTime(summary.submittedAt) || "día indicado"
              }.`
            : "Registramos tu respuesta correctamente. Te esperamos."}
        </div>
        {summary?.members?.length ? (
          <div className="sec-text" style={{ marginTop: 12 }}>
            {summary.members.map((member) => (
              <div key={member.name}>
                {member.name}: {normalizeAnswer(member.answer) || "—"}
              </div>
            ))}
          </div>
        ) : null}
        {summary?.extras?.length ? (
          <div className="sec-text" style={{ marginTop: 12 }}>
            Acompañantes extra:
            {summary.extras.map((extra, index) => (
              <div key={`${extra}-${index}`}>{extra}</div>
            ))}
          </div>
        ) : null}
        {summary?.note && (
          <div className="sec-text" style={{ marginTop: 12 }}>
            Nota: {summary.note}
          </div>
        )}
      </div>
    );
  }

  if (deadlinePassed) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <div className="sec-title">RSVP cerrado</div>
        <div className="sec-text">
          Cerramos confirmaciones el {RSVP_DEADLINE_LABEL}. Si necesitas comunicar algo,
          contáctanos directamente para apoyarte.
        </div>
      </div>
    );
  }

  return (
    <div className="rsvp-card gold-card">
      <div className="rsvp-header">
        <div className="sec-text font-petrona">
          Grupo: <b>{fallbackName || "Invitado/a"}</b>
        </div>
      </div>

      <div className="rsvp-members">
        {members.map((name) => {
          const answer = answers[name];
          return (
            <div key={name} className="member-row">
              <div className="member-name">{name}</div>
              <div className="btns">
                <button
                  type="button"
                  className={`btn-accept ${answer === ANSWER_YES_VALUE ? "active" : ""}`}
                  onClick={() => setAnswer(name, ANSWER_YES_VALUE)}
                  aria-pressed={answer === ANSWER_YES_VALUE}
                >
                  {ANSWER_YES_LABEL}
                </button>
                <button
                  type="button"
                  className={`btn-decline ${answer === ANSWER_NO_VALUE ? "active" : ""}`}
                  onClick={() => setAnswer(name, ANSWER_NO_VALUE)}
                  aria-pressed={answer === ANSWER_NO_VALUE}
                >
                  {ANSWER_NO_LABEL}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {extraSlots > 0 && !existingStatus && (
        <div className="rsvp-extras" style={{ marginTop: 16 }}>
          <label className="sec-text">
            Acompañantes extra (opcional)
          </label>
          {Array.from({ length: extraSlots }).map((_, index) => (
            <input
              key={`extra-${index}`}
              className="input"
              style={{ marginTop: 8 }}
              placeholder={`Nombre del acompañante ${index + 1}`}
              value={extraNames[index] || ""}
              onChange={(event) => {
                const nextValue = event.target.value;
                setExtraNames((prev) => {
                  const clone = [...prev];
                  clone[index] = nextValue;
                  return clone;
                });
              }}
            />
          ))}
          <p className="text-xs text-gray-500 mt-2">
            Déjalo en blanco si no utilizarás los lugares extra.
          </p>
        </div>
      )}

      <div className="rsvp-note" style={{ marginTop: 16 }}>
        <label className="sec-text" htmlFor="rsvp-note">
          Mensaje para los novios (opcional)
        </label>
        <textarea
          id="rsvp-note"
          className="textarea"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Cuéntanos si tienes alguna preferencia o mensaje especial."
        />
      </div>

      <div className="rsvp-send" style={{ marginTop: 18 }}>
        <button
          type="button"
          className="btn-confirm"
          onClick={handleSubmit}
          disabled={statusLoading || !allSelected || sending}
        >
          {sending ? "Guardando..." : "Confirmar asistencia"}
        </button>
      </div>

      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

