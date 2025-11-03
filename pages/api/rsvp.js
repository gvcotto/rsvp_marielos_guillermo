export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  const url = process.env.GSHEET_POST_URL;
  if (!url) {
    return res
      .status(500)
      .json({ error: "Falta GSHEET_POST_URL en variables de entorno" });
  }

  const token = req.body?.token;
  const statusBase = process.env.GSHEET_GET_URL;

  if (token && statusBase) {
    try {
      const statusRes = await fetch(
        `${statusBase}?action=rsvpStatus&token=${encodeURIComponent(token)}`
      );
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        if (statusJson?.ok && statusJson.status) {
          return res.status(409).json({
            ok: false,
            reason: "already_confirmed",
            status: statusJson.status,
          });
        }
      }
    } catch (err) {
      console.error("No se pudo verificar RSVP previo", err);
    }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(502).json({ error: text || "Error en Apps Script" });
    }

    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(200).json({ ok: true, text });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
