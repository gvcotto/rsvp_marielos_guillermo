export default async function handler(req, res) {
  try {
    const { token } = req.query || {};
    if (!token) {
      return res.status(400).json({ ok: false, error: "Falta token" });
    }

    const base = process.env.GSHEET_GET_URL;
    if (!base) {
      return res
        .status(500)
        .json({ ok: false, error: "Falta GSHEET_GET_URL en variables de entorno" });
    }

    const response = await fetch(
      `${base}?action=party&token=${encodeURIComponent(token)}`
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
