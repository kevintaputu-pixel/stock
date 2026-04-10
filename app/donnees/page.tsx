"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type ThemeName = "dark" | "green" | "tropical" | "whiteBlue";

const themes: Record<
  ThemeName,
  {
    bg: string;
    card: string;
    cardSoft: string;
    border: string;
    text: string;
    textSoft: string;
    accent: string;
    accent2: string;
    glow: string;
    danger: string;
  }
> = {
  dark: {
    bg: "#0b0b0f",
    card: "#111114",
    cardSoft: "#17171c",
    border: "#2a2a34",
    text: "#f4f4f5",
    textSoft: "#b3b3bf",
    accent: "#7c3aed",
    accent2: "#a78bfa",
    glow: "rgba(124, 58, 237, 0.18)",
    danger: "#ef4444",
  },
  green: {
    bg: "#0d1b12",
    card: "#14241a",
    cardSoft: "#1b3123",
    border: "#355b42",
    text: "#e8fff0",
    textSoft: "#b7d7c0",
    accent: "#22c55e",
    accent2: "#86efac",
    glow: "rgba(34, 197, 94, 0.18)",
    danger: "#ef4444",
  },
  tropical: {
    bg: "#0f1720",
    card: "#16212c",
    cardSoft: "#1d2d3b",
    border: "#35627d",
    text: "#eefcff",
    textSoft: "#b6d7df",
    accent: "#06b6d4",
    accent2: "#f59e0b",
    glow: "rgba(6, 182, 212, 0.18)",
    danger: "#ef4444",
  },
  whiteBlue: {
    bg: "#eff5ff",
    card: "#ffffff",
    cardSoft: "#f6f9ff",
    border: "#cfe0ff",
    text: "#0f172a",
    textSoft: "#5b6b89",
    accent: "#2563eb",
    accent2: "#60a5fa",
    glow: "rgba(37, 99, 235, 0.14)",
    danger: "#ef4444",
  },
};

const themeOrder: ThemeName[] = ["dark", "green", "tropical", "whiteBlue"];

type AppDataRow = {
  id: string;
  type: "email" | "person" | "code";
  value: string;
  created_at: string;
};

type AdminSettingsRow = {
  id: string;
  admin_email: string;
  updated_at: string;
};

type ProductRow = {
  fournisseur: string | null;
};

export default function DonneesPage() {
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [savingAdminEmail, setSavingAdminEmail] = useState(false);
  const router = useRouter();

  const [emailInput, setEmailInput] = useState("");
  const [personInput, setPersonInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [adminEmailInput, setAdminEmailInput] = useState("");

  const [emails, setEmails] = useState<AppDataRow[]>([]);
  const [persons, setPersons] = useState<AppDataRow[]>([]);
  const [codes, setCodes] = useState<AppDataRow[]>([]);
  const [adminSetting, setAdminSetting] = useState<AdminSettingsRow | null>(null);
  const [suppliers, setSuppliers] = useState<string[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("stock-theme");
    if (
      savedTheme === "dark" ||
      savedTheme === "green" ||
      savedTheme === "tropical" ||
      savedTheme === "whiteBlue"
    ) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);

      const [dataRes, suppliersRes, adminSettingsRes] = await Promise.all([
        supabase
          .from("app_data")
          .select("id, type, value, created_at")
          .in("type", ["email", "person", "code"])
          .order("created_at", { ascending: false }),

        supabase.from("products").select("fournisseur"),

        supabase
          .from("admin_settings")
          .select("id, admin_email, updated_at")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (dataRes.error) {
        console.error(dataRes.error);
        alert("Erreur lors du chargement des données.");
        return;
      }

      if (suppliersRes.error) {
        console.error(suppliersRes.error);
        alert("Erreur lors du chargement des fournisseurs.");
        return;
      }

      if (adminSettingsRes.error) {
        console.error(adminSettingsRes.error);
        alert("Erreur lors du chargement de l'e-mail admin.");
        return;
      }

      const dataRows = (dataRes.data || []) as AppDataRow[];
      const productRows = (suppliersRes.data || []) as ProductRow[];
      const adminRow = (adminSettingsRes.data as AdminSettingsRow | null) || null;

      setEmails(dataRows.filter((row) => row.type === "email"));
      setPersons(dataRows.filter((row) => row.type === "person"));
      setCodes(dataRows.filter((row) => row.type === "code"));
      setAdminSetting(adminRow);
      setAdminEmailInput(adminRow?.admin_email || "");

      const uniqueSuppliers = Array.from(
        new Set(
          productRows
            .map((row) => row.fournisseur?.trim() || "")
            .filter((value) => value.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, "fr"));

      setSuppliers(uniqueSuppliers);
    } finally {
      setLoading(false);
    }
  }

  function cycleTheme() {
    const currentIndex = themeOrder.indexOf(theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(nextTheme);
    localStorage.setItem("stock-theme", nextTheme);
  }

  function getThemeLabel(value: ThemeName) {
    if (value === "dark") return "Sombre";
    if (value === "green") return "Vert";
    if (value === "tropical") return "Tropical";
    return "Blanc / Bleu";
  }

  async function addEmail() {
    const value = emailInput.trim().toLowerCase();

    if (!value) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      alert("Adresse e-mail invalide.");
      return;
    }

    const alreadyExists = emails.some(
      (item) => item.value.trim().toLowerCase() === value
    );
    if (alreadyExists) {
      alert("Cet e-mail existe déjà.");
      return;
    }

    try {
      setSavingEmail(true);

      const { error } = await supabase.from("app_data").insert({
        type: "email",
        value,
      });

      if (error) {
        console.error(error);
        alert("Impossible d'enregistrer l'e-mail.");
        return;
      }

      setEmailInput("");
      await loadAll();
    } finally {
      setSavingEmail(false);
    }
  }

  async function addPerson() {
    const value = personInput.trim();

    if (!value) return;

    const alreadyExists = persons.some(
      (item) => item.value.trim().toLowerCase() === value.toLowerCase()
    );
    if (alreadyExists) {
      alert("Ce nom existe déjà.");
      return;
    }

    try {
      setSavingPerson(true);

      const { error } = await supabase.from("app_data").insert({
        type: "person",
        value,
      });

      if (error) {
        console.error(error);
        alert("Impossible d'enregistrer ce nom.");
        return;
      }

      setPersonInput("");
      await loadAll();
    } finally {
      setSavingPerson(false);
    }
  }

  async function addCode() {
    const value = codeInput.trim();

    if (!value) return;

    const alreadyExists = codes.some((item) => item.value.trim() === value);
    if (alreadyExists) {
      alert("Ce code existe déjà.");
      return;
    }

    try {
      setSavingCode(true);

      const { error } = await supabase.from("app_data").insert({
        type: "code",
        value,
      });

      if (error) {
        console.error(error);
        alert("Impossible d'enregistrer ce code.");
        return;
      }

      setCodeInput("");
      await loadAll();
    } finally {
      setSavingCode(false);
    }
  }

  async function saveAdminEmail() {
    const value = adminEmailInput.trim().toLowerCase();

    if (!value) {
      alert("Ajoute un e-mail admin.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      alert("Adresse e-mail admin invalide.");
      return;
    }

    try {
      setSavingAdminEmail(true);

      if (adminSetting?.id) {
        const { error } = await supabase
          .from("admin_settings")
          .update({
            admin_email: value,
            updated_at: new Date().toISOString(),
          })
          .eq("id", adminSetting.id);

        if (error) {
          console.error(error);
          alert("Impossible de mettre à jour l'e-mail admin.");
          return;
        }
      } else {
        const { error } = await supabase.from("admin_settings").insert({
          admin_email: value,
        });

        if (error) {
          console.error(error);
          alert("Impossible d'enregistrer l'e-mail admin.");
          return;
        }
      }

      await loadAll();
      alert("E-mail admin enregistré.");
    } finally {
      setSavingAdminEmail(false);
    }
  }

  async function clearAdminEmail() {
    if (!adminSetting?.id) {
      setAdminEmailInput("");
      return;
    }

    const ok = window.confirm("Supprimer l'e-mail admin actuel ?");
    if (!ok) return;

    const { error } = await supabase
      .from("admin_settings")
      .delete()
      .eq("id", adminSetting.id);

    if (error) {
      console.error(error);
      alert("Suppression impossible.");
      return;
    }

    setAdminEmailInput("");
    await loadAll();
  }

  async function removeItem(id: string) {
    const ok = window.confirm("Supprimer cet élément ?");
    if (!ok) return;

    const { error } = await supabase.from("app_data").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("Suppression impossible.");
      return;
    }

    await loadAll();
  }

  const currentTheme = themes[theme];

  const supplierCountLabel = useMemo(() => {
    return `${suppliers.length} fournisseur${suppliers.length > 1 ? "s" : ""}`;
  }, [suppliers.length]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: currentTheme.bg,
        color: currentTheme.text,
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 1300,
          margin: "0 auto",
          display: "grid",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: currentTheme.textSoft,
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              Configuration
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 42,
                lineHeight: 1,
                fontWeight: 900,
              }}
            >
              Données
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={cycleTheme}
              style={{
                background: currentTheme.accent,
                color: "#fff",
                border: "none",
                padding: "12px 16px",
                borderRadius: 14,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: `0 10px 30px ${currentTheme.glow}`,
              }}
            >
              Mode : {getThemeLabel(theme)}
            </button>

            <Link href="/" style={homeButtonStyle(currentTheme)}>
              Retour accueil
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={cardStyle(currentTheme)}>Chargement...</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 20,
              alignItems: "start",
            }}
          >
            <section style={cardStyle(currentTheme)}>
              <div style={sectionLabelStyle(currentTheme)}>E-mails</div>

              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Ajouter une adresse e-mail"
                  style={inputStyle(currentTheme)}
                />
                <button
                  onClick={addEmail}
                  disabled={savingEmail}
                  style={primaryButtonStyle(currentTheme)}
                >
                  {savingEmail ? "..." : "Ajouter"}
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {emails.length === 0 ? (
                  <div style={emptyStyle(currentTheme)}>
                    Aucun e-mail enregistré
                  </div>
                ) : (
                  emails.map((item) => (
                    <div key={item.id} style={rowStyle(currentTheme)}>
                      <div style={{ fontWeight: 700 }}>{item.value}</div>
                      <button
                        onClick={() => removeItem(item.id)}
                        style={deleteButtonStyle(currentTheme)}
                      >
                        Supprimer
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section style={cardStyle(currentTheme)}>
              <div style={sectionLabelStyle(currentTheme)}>Personnes</div>

              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input
                  value={personInput}
                  onChange={(e) => setPersonInput(e.target.value)}
                  placeholder="Ajouter un nom de personne"
                  style={inputStyle(currentTheme)}
                />
                <button
                  onClick={addPerson}
                  disabled={savingPerson}
                  style={primaryButtonStyle(currentTheme)}
                >
                  {savingPerson ? "..." : "Ajouter"}
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {persons.length === 0 ? (
                  <div style={emptyStyle(currentTheme)}>
                    Aucune personne enregistrée
                  </div>
                ) : (
                  persons.map((item) => (
                    <div key={item.id} style={rowStyle(currentTheme)}>
                      <div style={{ fontWeight: 700 }}>{item.value}</div>
                      <button
                        onClick={() => removeItem(item.id)}
                        style={deleteButtonStyle(currentTheme)}
                      >
                        Supprimer
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section style={cardStyle(currentTheme)}>
              <div style={sectionLabelStyle(currentTheme)}>Code confidentiel</div>

              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Ajouter un code"
                  style={inputStyle(currentTheme)}
                />
                <button
                  onClick={addCode}
                  disabled={savingCode}
                  style={primaryButtonStyle(currentTheme)}
                >
                  {savingCode ? "..." : "Ajouter"}
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {codes.length === 0 ? (
                  <div style={emptyStyle(currentTheme)}>
                    Aucun code enregistré
                  </div>
                ) : (
                  codes.map((item) => (
                    <div key={item.id} style={rowStyle(currentTheme)}>
                      <div style={{ fontWeight: 700 }}>{item.value}</div>
                      <button
                        onClick={() => removeItem(item.id)}
                        style={deleteButtonStyle(currentTheme)}
                      >
                        Supprimer
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section style={cardStyle(currentTheme)}>
              <div style={sectionLabelStyle(currentTheme)}>E-mail Admin</div>

              <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                <input
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="Enregistrer l'e-mail admin"
                  style={inputStyle(currentTheme)}
                />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={saveAdminEmail}
                    disabled={savingAdminEmail}
                    style={primaryButtonStyle(currentTheme)}
                  >
                    {savingAdminEmail ? "..." : adminSetting ? "Mettre à jour" : "Enregistrer"}
                  </button>

                  <button
                    onClick={clearAdminEmail}
                    disabled={savingAdminEmail && !adminSetting}
                    style={secondaryButtonStyle(currentTheme)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {!adminSetting ? (
                  <div style={emptyStyle(currentTheme)}>
                    Aucun e-mail admin enregistré dans la table admin_settings
                  </div>
                ) : (
                  <div style={rowStyle(currentTheme)}>
                    <div style={{ fontWeight: 700 }}>{adminSetting.admin_email}</div>
                    <div style={{ color: currentTheme.textSoft, fontSize: 12 }}>
                      Source officielle des validations d'accès
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section style={cardStyle(currentTheme)}>
              <div style={sectionLabelStyle(currentTheme)}>
                Fournisseurs du stock
              </div>

              <div
                style={{
                  color: currentTheme.textSoft,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {supplierCountLabel}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {suppliers.length === 0 ? (
                  <div style={emptyStyle(currentTheme)}>
                    Aucun fournisseur trouvé dans la table products
                  </div>
                ) : (
                  suppliers.map((supplier) => (
                    <div key={supplier} style={supplierRowStyle(currentTheme)}>
                      {supplier}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function cardStyle(theme: {
  card: string;
  border: string;
  glow: string;
}): React.CSSProperties {
  return {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 24,
    padding: 20,
    boxShadow: `0 20px 60px ${theme.glow}`,
  };
}

function sectionLabelStyle(theme: { textSoft: string }): React.CSSProperties {
  return {
    color: theme.textSoft,
    fontSize: 13,
    marginBottom: 14,
    fontWeight: 700,
    letterSpacing: 0.3,
  };
}

function inputStyle(theme: {
  cardSoft: string;
  border: string;
  text: string;
}): React.CSSProperties {
  return {
    flex: 1,
    background: theme.cardSoft,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    borderRadius: 14,
    padding: "14px 16px",
    outline: "none",
    fontSize: 15,
  };
}

function primaryButtonStyle(theme: {
  accent: string;
}): React.CSSProperties {
  return {
    background: theme.accent,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "14px 16px",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function secondaryButtonStyle(theme: {
  cardSoft: string;
  border: string;
  text: string;
}): React.CSSProperties {
  return {
    background: theme.cardSoft,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: "14px 16px",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function deleteButtonStyle(theme: {
  danger: string;
}): React.CSSProperties {
  return {
    background: theme.danger,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function rowStyle(theme: {
  cardSoft: string;
  border: string;
}): React.CSSProperties {
  return {
    background: theme.cardSoft,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  };
}

function supplierRowStyle(theme: {
  cardSoft: string;
  border: string;
  text: string;
}): React.CSSProperties {
  return {
    background: theme.cardSoft,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 14,
    fontWeight: 700,
    color: theme.text,
  };
}

function emptyStyle(theme: {
  cardSoft: string;
  border: string;
  textSoft: string;
}): React.CSSProperties {
  return {
    background: theme.cardSoft,
    border: `1px dashed ${theme.border}`,
    borderRadius: 16,
    padding: 16,
    color: theme.textSoft,
  };
}

function homeButtonStyle(theme: {
  cardSoft: string;
  border: string;
  text: string;
}): React.CSSProperties {
  return {
    textDecoration: "none",
    background: theme.cardSoft,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    padding: "12px 16px",
    borderRadius: 14,
    fontWeight: 800,
  };
}
