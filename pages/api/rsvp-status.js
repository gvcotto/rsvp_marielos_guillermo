export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  const { token } = req.query || {};
  if (!token) {
    return res.status(400).json({ error: "Falta token" });
  }

  const base = process.env.GSHEET_GET_URL;
  if (!base) {
    return res
      .status(500)
      .json({ error: "Falta GSHEET_GET_URL en variables de entorno" });
  }

  try {
    const response = await fetch(
      `${base}?action=rsvpStatus&token=${encodeURIComponent(token)}`
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
