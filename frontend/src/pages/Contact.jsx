import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import Table from "../components/Table";
import Button from "../components/Button";
import { Field } from "../components/Field";
import Empty from "../components/Empty";
import "../styles/pages/contact.css";

export default function Contact() {
  const [rows, setRows] = useState([]);
  const [myInfo, setMyInfo] = useState({
    phone: "",
    bkash: "",
    nagad: "",
  });
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "null"),
    []
  );

  const loadAll = async () => {
    setLoadingList(true);
    try {
      const { data } = await api.get("/contacts");
      setRows(data || []);
    } finally {
      setLoadingList(false);
    }
  };

  const loadMine = async () => {
    try {
      const { data } = await api.get("/contacts/me");
      setMyInfo({
        phone: data.phone || "",
        bkash: data.bkash || "",
        nagad: data.nagad || "",
      });
    } catch {
      // no record yet – leave defaults
    }
  };

  useEffect(() => {
    loadAll();
    loadMine();
  }, []);

  const saveMine = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const { data } = await api.put("/contacts/me", {
        phone: myInfo.phone,
        bkash: myInfo.bkash,
        nagad: myInfo.nagad,
      });
      setMyInfo({
        phone: data.phone || "",
        bkash: data.bkash || "",
        nagad: data.nagad || "",
      });
      setMsg("Contact info updated.");
      await loadAll();
    } catch (ex) {
      setErr(ex?.response?.data?.error || "Failed to save contact info.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "tpin", label: "TPIN" },
    { key: "role", label: "Role" },
    { key: "phone", label: "Contact Number" },
    { key: "bkash", label: "bKash Number" },
    { key: "nagad", label: "Nagad Number" },
  ];

  return (
    <div className="page page-contact">
      <PageHeader
        title="Contact Directory"
        meta={
          <div className="badge">
            Total users: {rows?.length || 0}
          </div>
        }
      />

      <div className="contact-layout">
        {/* LEFT: my own info */}
        <Section
          title="My Contact Info"
          description="These numbers can be seen by everyone in the directory. You can edit only your own."
        >
          <form onSubmit={saveMine} className="contact-form">
            <Field label="Your name">
              <input value={user?.name || ""} readOnly />
            </Field>
            <Field label="Your TPIN">
              <input value={user?.tpin || ""} readOnly />
            </Field>
            <Field label="Contact number">
              <input
                value={myInfo.phone}
                onChange={(e) =>
                  setMyInfo((s) => ({ ...s, phone: e.target.value }))
                }
                placeholder="01XXXXXXXXX"
              />
            </Field>
            <Field label="bKash number">
              <input
                value={myInfo.bkash}
                onChange={(e) =>
                  setMyInfo((s) => ({ ...s, bkash: e.target.value }))
                }
                placeholder="01XXXXXXXXX"
              />
            </Field>
            <Field label="Nagad number">
              <input
                value={myInfo.nagad}
                onChange={(e) =>
                  setMyInfo((s) => ({ ...s, nagad: e.target.value }))
                }
                placeholder="01XXXXXXXXX"
              />
            </Field>

            <div className="contact-actions">
              <Button disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>

            {err && (
              <div className="badge err" style={{ marginTop: 8 }}>
                {err}
              </div>
            )}
            {msg && (
              <div className="badge ok" style={{ marginTop: 8 }}>
                {msg}
              </div>
            )}
          </form>
        </Section>

        {/* RIGHT: directory */}
        <Section
          title="Directory"
          description="Everyone can see this list. Only the owner of each row can edit their numbers on the left."
        >
          {rows.length === 0 && !loadingList ? (
            <Empty icon="📇" title="No users found" />
          ) : (
            <Table
              columns={columns}
              rows={rows}
              renderCell={(c, row) => {
                const value = row[c.key];
                if (!value) return <span className="subtle">—</span>;
                if (c.key === "role") {
                  return (
                    <span style={{ textTransform: "capitalize" }}>
                      {value}
                    </span>
                  );
                }
                return value;
              }}
            />
          )}
        </Section>
      </div>
    </div>
  );
}
