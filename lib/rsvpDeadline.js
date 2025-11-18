const BASE_DEADLINE_TS = Date.parse("2025-11-16T06:00:00Z");
const BASE_DEADLINE_LABEL = "15 de noviembre de 2025";

const EXTENDED_DEADLINE_TS = Date.parse("2025-12-01T06:00:00Z");
const EXTENDED_DEADLINE_LABEL = "30 de noviembre de 2025";

const EXTENDED_TOKEN_SET = new Set(
  (process.env.NEXT_PUBLIC_RSVP_EXTENDED_TOKENS || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
);

export const getDeadlineConfig = (token) => {
  if (token && EXTENDED_TOKEN_SET.has(token)) {
    return {
      ts: EXTENDED_DEADLINE_TS,
      label: EXTENDED_DEADLINE_LABEL,
      extended: true,
    };
  }

  return {
    ts: BASE_DEADLINE_TS,
    label: BASE_DEADLINE_LABEL,
    extended: false,
  };
};

export const hasDeadlinePassed = (token) => {
  const { ts } = getDeadlineConfig(token);
  return Date.now() >= ts;
};

