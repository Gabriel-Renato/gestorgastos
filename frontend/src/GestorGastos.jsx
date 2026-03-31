import { useState, useMemo, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus, Bell, Home, CreditCard, Tag, Users, AlertTriangle, CheckCircle, Clock, Edit2, Trash2, X, DollarSign, Search, Calendar } from "lucide-react";
import * as api from "./api.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CAT_FALLBACK = { name: "Outros", color: "#6b7280", icon: "📦" };

const PAY_METHODS = [
  { v: "pix",         l: "PIX",               icon: "⚡" },
  { v: "credit_card", l: "Cartão de Crédito",  icon: "💳" },
  { v: "debit",       l: "Cartão de Débito",   icon: "💳" },
  { v: "cash",        l: "Dinheiro",           icon: "💵" },
  { v: "transfer",    l: "Transferência",      icon: "🏦" },
];

const STATUS_INFO = {
  paid:    { label: "Pago",     color: "#10b981", bg: "#d1fae5", tc: "#065f46" },
  pending: { label: "Pendente", color: "#f59e0b", bg: "#fef3c7", tc: "#92400e" },
  overdue: { label: "Vencido",  color: "#ef4444", bg: "#fee2e2", tc: "#991b1b" },
};

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function mapExpenseFromApi(e) {
  return {
    id: e.id,
    title: e.title,
    amount: parseFloat(e.amount),
    category: e.category?.name ?? "",
    categoryId: e.category_id,
    personId: e.person_id,
    person: e.person?.name ?? "",
    location: e.location ?? "",
    paymentMethod: e.payment_method,
    paymentMonth: e.payment_month,
    dueDate: e.due_date ? String(e.due_date).slice(0, 10) : "",
    installments: e.installments ?? 1,
    currentInstallment: e.current_installment ?? 1,
    notes: e.notes ?? "",
    status: e.status,
  };
}

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtDate = (d) => { if (!d) return "—"; const [y,m,day] = d.split("-"); return `${day}/${m}/${y}`; };

const todayStr = () => new Date().toISOString().slice(0, 10);

const getDays = (dueDate) => {
  if (!dueDate) return 999;
  const t = new Date(todayStr() + "T00:00:00");
  const d = new Date(dueDate + "T00:00:00");
  return Math.floor((d - t) / 86400000);
};

const getCat = (categories, name) => categories.find((c) => c.name === name) || CAT_FALLBACK;
const getPM = (v) => PAY_METHODS.find((m) => m.v === v) || PAY_METHODS[0];

const monthLabel = (ym) => {
  if (!ym || ym.length < 7) return "";
  const [y, m] = ym.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const Sidebar = ({ view, setView, alertCount, footerLabel }) => {
  const nav = [
    { id:"dashboard",  label:"Dashboard",  Icon:Home       },
    { id:"expenses",   label:"Gastos",     Icon:CreditCard },
    { id:"alerts",     label:"Alertas",    Icon:Bell,  badge:alertCount },
    { id:"categories", label:"Categorias", Icon:Tag        },
    { id:"people",     label:"Pessoas",    Icon:Users      },
  ];
  return (
    <div style={{ width:240, background:"#0f172a", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"#f59e0b", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <DollarSign size={20} color="white" />
          </div>
          <div>
            <div style={{ color:"white", fontWeight:700, fontSize:16 }}>FinanceApp</div>
            <div style={{ color:"rgba(255,255,255,.4)", fontSize:11 }}>Gestão de Gastos</div>
          </div>
        </div>
      </div>
      <nav style={{ padding:"14px 10px", flex:1 }}>
        {nav.map(({ id, label, Icon, badge }) => {
          const active = view === id;
          return (
            <button key={id} onClick={() => setView(id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", borderRadius:8, border:"none", cursor:"pointer", background:active ? "rgba(245,158,11,.15)" : "transparent", color:active ? "#f59e0b" : "rgba(255,255,255,.6)", marginBottom:3, textAlign:"left", fontSize:14, fontWeight:active ? 600 : 400, position:"relative" }}>
              {active && <div style={{ position:"absolute", left:0, top:"18%", bottom:"18%", width:3, background:"#f59e0b", borderRadius:"0 3px 3px 0" }} />}
              <Icon size={17} />
              <span style={{ flex:1 }}>{label}</span>
              {badge > 0 && <span style={{ background:"#ef4444", color:"white", borderRadius:10, fontSize:10, padding:"1px 6px", fontWeight:700 }}>{badge}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(255,255,255,.08)", color:"rgba(255,255,255,.25)", fontSize:11 }}>
        {footerLabel || "—"}
      </div>
    </div>
  );
};

// ─── BADGE ────────────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const s = STATUS_INFO[status] || STATUS_INFO.pending;
  return <span style={{ background:s.bg, color:s.tc, padding:"2px 9px", borderRadius:12, fontSize:11, fontWeight:600 }}>{s.label}</span>;
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color="#f59e0b", Icon }) => (
  <div style={{ background:"white", borderRadius:12, padding:"18px 20px", border:"1px solid #e5e7eb", flex:1 }}>
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
      <div>
        <div style={{ fontSize:11, color:"#6b7280", marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</div>
        <div style={{ fontSize:22, fontWeight:700, color:"#111827" }}>{value}</div>
        {sub && <div style={{ fontSize:12, color:"#9ca3af", marginTop:3 }}>{sub}</div>}
      </div>
      <div style={{ width:40, height:40, borderRadius:10, background:color+"22", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={19} color={color} />
      </div>
    </div>
  </div>
);

function buildFormState(expense, categories, people) {
  const defaultMonth = new Date().toISOString().slice(0, 7);
  if (!expense) {
    return {
      title: "",
      amount: "",
      categoryId: categories[0]?.id ?? "",
      personId: people[0]?.id ?? "",
      location: "",
      paymentMethod: "pix",
      paymentMonth: defaultMonth,
      dueDate: "",
      installments: 1,
      currentInstallment: 1,
      notes: "",
      status: "pending",
    };
  }
  return {
    title: expense.title,
    amount: String(expense.amount),
    categoryId: expense.categoryId,
    personId: expense.personId,
    location: expense.location || "",
    paymentMethod: expense.paymentMethod,
    paymentMonth: expense.paymentMonth,
    dueDate: expense.dueDate || "",
    installments: expense.installments,
    currentInstallment: expense.currentInstallment,
    notes: expense.notes || "",
    status: expense.status,
  };
}

// ─── EXPENSE MODAL ────────────────────────────────────────────────────────────
const ExpenseModal = ({ expense, categories, people, onSave, onClose }) => {
  const [form, setForm] = useState(() => buildFormState(expense, categories, people));
  useEffect(() => {
    setForm(buildFormState(expense, categories, people));
  }, [expense, categories, people]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim() || form.amount === "" || form.amount === null) {
      alert("Preencha descrição e valor.");
      return;
    }
    if (!form.categoryId || !form.personId) {
      alert("Cadastre ao menos uma categoria e uma pessoa.");
      return;
    }
    onSave({ ...form, id: expense?.id });
  };

  const inp = { width:"100%", padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box", background:"white", color:"#111827" };
  const lbl = { display:"block", fontSize:11, fontWeight:600, color:"#374151", marginBottom:4, textTransform:"uppercase", letterSpacing:".04em" };
  const row = { display:"grid", gap:12, marginBottom:14 };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <div style={{ background:"white", borderRadius:16, width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 25px 60px rgba(0,0,0,.3)" }}>
        {/* Header */}
        <div style={{ padding:"18px 24px 14px", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"white", borderRadius:"16px 16px 0 0", zIndex:1 }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:"#111827" }}>{expense ? "✏️ Editar Gasto" : "➕ Novo Gasto"}</h2>
          <button onClick={onClose} style={{ background:"#f3f4f6", border:"none", borderRadius:8, padding:8, cursor:"pointer", display:"flex" }}><X size={15} color="#6b7280" /></button>
        </div>
        {/* Body */}
        <div style={{ padding:"20px 24px" }}>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Descrição *</label>
            <input style={inp} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex: Supermercado, Conta de luz…" />
          </div>
          <div style={{ ...row, gridTemplateColumns:"1fr 1fr" }}>
            <div>
              <label style={lbl}>Valor (R$) *</label>
              <input type="number" style={inp} value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0,00" min="0" step="0.01" />
            </div>
            <div>
              <label style={lbl}>Status</label>
              <select style={inp} value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Vencido</option>
              </select>
            </div>
          </div>
          <div style={{ ...row, gridTemplateColumns:"1fr 1fr" }}>
            <div>
              <label style={lbl}>Categoria</label>
              <select
                style={inp}
                value={form.categoryId === "" ? "" : String(form.categoryId)}
                onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : "")}
              >
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Quem fez o gasto</label>
              <select
                style={inp}
                value={form.personId === "" ? "" : String(form.personId)}
                onChange={(e) => set("personId", e.target.value ? Number(e.target.value) : "")}
              >
                {people.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Estabelecimento / Onde</label>
            <input style={inp} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Ex: Carrefour, Posto Shell, Netflix…" />
          </div>
          <div style={{ ...row, gridTemplateColumns:"1fr 1fr" }}>
            <div>
              <label style={lbl}>Forma de Pagamento</label>
              <select style={inp} value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)}>
                {PAY_METHODS.map(m => <option key={m.v} value={m.v}>{m.icon} {m.l}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Mês de Pagamento</label>
              <input type="month" style={inp} value={form.paymentMonth} onChange={e => set("paymentMonth", e.target.value)} />
            </div>
          </div>
          <div style={{ ...row, gridTemplateColumns:"1fr 1fr 1fr" }}>
            <div>
              <label style={lbl}>Vencimento</label>
              <input type="date" style={inp} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Nº Parcelas</label>
              <input type="number" style={inp} value={form.installments} onChange={e => set("installments", parseInt(e.target.value)||1)} min="1" max="48" />
            </div>
            <div>
              <label style={lbl}>Parcela Atual</label>
              <input type="number" style={inp} value={form.currentInstallment} onChange={e => set("currentInstallment", parseInt(e.target.value)||1)} min="1" max={form.installments} />
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Observações</label>
            <textarea style={{ ...inp, minHeight:60, resize:"vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Informações adicionais…" />
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"10px 20px", borderRadius:8, border:"1px solid #d1d5db", background:"white", cursor:"pointer", fontSize:13, color:"#374151", fontWeight:500 }}>Cancelar</button>
            <button onClick={handleSave} style={{ padding:"10px 22px", borderRadius:8, border:"none", background:"#f59e0b", cursor:"pointer", fontSize:13, color:"white", fontWeight:700 }}>
              {expense ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────
const DashboardView = ({
  dashboard,
  expenses,
  categories,
  dashMonth,
  setDashMonth,
  onAdd,
  onMarkPaid,
  loading,
}) => {
  const total = dashboard?.total ?? 0;
  const paid = dashboard?.paid ?? 0;
  const pending = dashboard?.pending ?? 0;
  const me = expenses.filter((e) => e.paymentMonth === dashMonth);
  const monthlyData = (dashboard?.monthlyChart ?? []).map((r) => ({
    name: r.label,
    Total: r.total,
    Pago: r.paid,
  }));

  const catData = (dashboard?.byCategory ?? [])
    .map((c) => ({
      name: c.name,
      value: c.total,
      color: getCat(categories, c.name).color,
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const alertList = (dashboard?.alerts ?? []).map(mapExpenseFromApi);

  const card = (bg, border) => ({
    padding: "10px 14px",
    borderRadius: 8,
    background: bg,
    border: `1px solid ${border}`,
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 12,
  });

  if (loading && !dashboard) {
    return (
      <div style={{ color: "#6b7280", fontSize: 15 }}>
        Carregando dashboard…
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            Visão geral · {monthLabel(dashMonth)}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}>
            Mês
            <input type="month" value={dashMonth} onChange={(e) => setDashMonth(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} />
          </label>
          <button onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f59e0b", color: "white", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            <Plus size={15} /> Novo Gasto
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Total do Mês" value={fmt(total)} sub={`${me.length} gastos`} color="#f59e0b" Icon={DollarSign} />
        <StatCard label="Pago" value={fmt(paid)} sub={`${me.filter((e) => e.status === "paid").length} itens`} color="#10b981" Icon={CheckCircle} />
        <StatCard label="A Pagar" value={fmt(pending)} sub={`${me.filter((e) => e.status !== "paid").length} pendentes`} color="#3b82f6" Icon={Clock} />
        <StatCard label="Alertas" value={alertList.length} sub="vencem em 7 dias" color="#ef4444" Icon={AlertTriangle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18, marginBottom: 24 }}>
        <div style={{ background: "white", borderRadius: 12, padding: "20px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#111827" }}>Gastos por Mês (últimos 6)</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="Total" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pago" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#e5e7eb", display: "inline-block" }} />
              Total
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b", display: "inline-block" }} />
              Pago
            </span>
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: "20px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#111827" }}>
            Por Categoria ({monthLabel(dashMonth).split(" ")[0] || "—"})
          </h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2} dataKey="value">
                {catData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div>
            {catData.slice(0, 5).map((c) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f9fafb", fontSize: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                  <span style={{ color: "#374151" }}>{c.name}</span>
                </span>
                <span style={{ color: "#6b7280", fontWeight: 500 }}>{fmt(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {alertList.length > 0 && (
        <div style={{ background: "white", borderRadius: 12, padding: "20px", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={17} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>Alertas de Vencimento</h3>
          </div>
          {alertList.map((e) => {
            const days = getDays(e.dueDate);
            const over = days < 0 || e.status === "overdue";
            const today_ = days === 0;
            const bg = over ? "#fef2f2" : today_ ? "#fffbeb" : "#f0fdf4";
            const tagBg = over ? "#fee2e2" : today_ ? "#fef3c7" : "#dcfce7";
            const tagColor = over ? "#dc2626" : today_ ? "#92400e" : "#166534";
            const tagLabel = over ? "VENCIDO" : today_ ? "HOJE!" : `${days}d`;
            return (
              <div key={e.id} style={{ ...card(bg, over ? "#fecaca" : today_ ? "#fde68a" : "#bbf7d0") }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                    {e.person} · {e.location} · {fmtDate(e.dueDate)}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: over ? "#ef4444" : "#111827" }}>{fmt(e.amount)}</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: tagBg, color: tagColor, whiteSpace: "nowrap" }}>{tagLabel}</span>
                <button onClick={() => onMarkPaid(e.id)} style={{ padding: "6px 12px", background: "#f59e0b", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                  Pagar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── EXPENSES VIEW ────────────────────────────────────────────────────────────
const ExpensesView = ({ expenses, categories, people, onEdit, onDelete, onMarkPaid, onAdd, filterMonth, setFilterMonth, filterCategory, setFilterCategory, filterPerson, setFilterPerson, filterStatus, setFilterStatus, searchTerm, setSearchTerm }) => {
  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (filterMonth    && e.paymentMonth !== filterMonth)   return false;
      if (filterCategory && e.category    !== filterCategory) return false;
      if (filterPerson   && e.person      !== filterPerson)   return false;
      if (filterStatus   && e.status      !== filterStatus)   return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const loc = (e.location || "").toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !loc.includes(q) && !e.person.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a,b) => (a.dueDate||"").localeCompare(b.dueDate||""));
  }, [expenses, filterMonth, filterCategory, filterPerson, filterStatus, searchTerm]);

  const totalFiltered = filtered.reduce((s,e) => s+e.amount, 0);
  const sel = { padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:12, background:"white", color:"#374151", cursor:"pointer", outline:"none" };
  const clearFilters = () => { setFilterMonth(""); setFilterCategory(""); setFilterPerson(""); setFilterStatus(""); setSearchTerm(""); };
  const hasFilter = filterMonth||filterCategory||filterPerson||filterStatus||searchTerm;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#111827" }}>Gastos</h1>
          <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:14 }}>{filtered.length} registros · {fmt(totalFiltered)}</p>
        </div>
        <button onClick={onAdd} style={{ display:"flex", alignItems:"center", gap:8, background:"#f59e0b", color:"white", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>
          <Plus size={15} /> Novo Gasto
        </button>
      </div>

      {/* Filters */}
      <div style={{ background:"white", borderRadius:12, padding:"14px 18px", border:"1px solid #e5e7eb", marginBottom:16, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:160, border:"1px solid #d1d5db", borderRadius:8, padding:"8px 12px" }}>
          <Search size={13} color="#9ca3af" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar gasto…" style={{ border:"none", outline:"none", fontSize:13, color:"#374151", flex:1, background:"transparent" }} />
        </div>
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={sel} />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={sel}>
          <option value="">Todas categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
          ))}
        </select>
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} style={sel}>
          <option value="">Todas as pessoas</option>
          {people.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={sel}>
          <option value="">Todos os status</option>
          <option value="paid">Pago</option>
          <option value="pending">Pendente</option>
          <option value="overdue">Vencido</option>
        </select>
        {hasFilter && <button onClick={clearFilters} style={{ padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:8, background:"white", cursor:"pointer", fontSize:12, color:"#6b7280" }}>✕ Limpar</button>}
      </div>

      {/* Table */}
      <div style={{ background:"white", borderRadius:12, border:"1px solid #e5e7eb", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f9fafb", borderBottom:"1px solid #e5e7eb" }}>
              {["Descrição","Valor","Categoria","Pessoa","Pagamento","Vencimento","Status","Ações"].map(h => (
                <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontWeight:600, color:"#6b7280", fontSize:10, textTransform:"uppercase", letterSpacing:".05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:"40px", textAlign:"center", color:"#9ca3af", fontSize:14 }}>Nenhum gasto encontrado</td></tr>
            ) : filtered.map(e => {
              const cat  = getCat(categories, e.category);
              const days = getDays(e.dueDate);
              const urgentDate = e.status !== "paid" && days <= 3;
              return (
                <tr key={e.id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ fontWeight:600, color:"#111827" }}>{e.title}</div>
                    {e.location && <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>📍 {e.location}</div>}
                    {e.installments > 1 && <div style={{ fontSize:10, color:"#3b82f6", marginTop:1 }}>Parcela {e.currentInstallment}/{e.installments}</div>}
                    {e.notes && <div style={{ fontSize:10, color:"#9ca3af", marginTop:1, fontStyle:"italic" }}>{e.notes}</div>}
                  </td>
                  <td style={{ padding:"11px 14px", fontWeight:700, color:"#111827", whiteSpace:"nowrap" }}>{fmt(e.amount)}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:cat.color+"18", color:cat.color, padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:600 }}>
                      {cat.icon} {e.category}
                    </span>
                  </td>
                  <td style={{ padding:"11px 14px", color:"#374151" }}>{e.person}</td>
                  <td style={{ padding:"11px 14px", color:"#374151" }}>{getPM(e.paymentMethod).icon} {getPM(e.paymentMethod).l}</td>
                  <td style={{ padding:"11px 14px", color:urgentDate?"#ef4444":"#374151", fontWeight:urgentDate?700:400, whiteSpace:"nowrap" }}>
                    {fmtDate(e.dueDate)}
                    {e.paymentMonth && <div style={{ fontSize:10, color:"#9ca3af", marginTop:1 }}>Pag: {MONTHS[parseInt(e.paymentMonth.split("-")[1])-1]}/{e.paymentMonth.split("-")[0]}</div>}
                  </td>
                  <td style={{ padding:"11px 14px" }}><Badge status={e.status} /></td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex", gap:4 }}>
                      {e.status !== "paid" && (
                        <button onClick={() => onMarkPaid(e.id)} title="Marcar pago" style={{ background:"#d1fae5", border:"none", borderRadius:6, padding:"5px 7px", cursor:"pointer", display:"flex" }}>
                          <CheckCircle size={13} color="#10b981" />
                        </button>
                      )}
                      <button onClick={() => onEdit(e)} title="Editar" style={{ background:"#dbeafe", border:"none", borderRadius:6, padding:"5px 7px", cursor:"pointer", display:"flex" }}>
                        <Edit2 size={13} color="#3b82f6" />
                      </button>
                      <button onClick={() => { if (window.confirm("Excluir este gasto?")) onDelete(e.id); }} title="Excluir" style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"5px 7px", cursor:"pointer", display:"flex" }}>
                        <Trash2 size={13} color="#ef4444" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── ALERTS VIEW ──────────────────────────────────────────────────────────────
const AlertsView = ({ overdue: overdueRaw, dueToday: dueTodayRaw, dueSoon: dueSoonRaw, upcoming: upcomingRaw, onMarkPaid, onEdit, loading }) => {
  const overdue = (overdueRaw ?? []).map(mapExpenseFromApi);
  const dueToday = (dueTodayRaw ?? []).map(mapExpenseFromApi);
  const dueSoon = (dueSoonRaw ?? []).map(mapExpenseFromApi);
  const upcoming = (upcomingRaw ?? []).map(mapExpenseFromApi);

  if (loading) {
    return <div style={{ color: "#6b7280", fontSize: 15 }}>Carregando alertas…</div>;
  }

  const Section = ({ title, items, color, Icon, emptyMsg }) => (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <Icon size={17} color={color} />
        <h3 style={{ margin:0, fontSize:15, fontWeight:600, color:"#111827" }}>{title}</h3>
        <span style={{ background:color+"20", color, borderRadius:10, fontSize:11, padding:"1px 8px", fontWeight:700 }}>{items.length}</span>
      </div>
      {items.length===0 ? (
        <div style={{ padding:"18px", background:"#f9fafb", borderRadius:10, textAlign:"center", color:"#9ca3af", fontSize:13 }}>{emptyMsg}</div>
      ) : [...items].sort((a,b)=>getDays(a.dueDate)-getDays(b.dueDate)).map(e => {
        const days = getDays(e.dueDate);
        return (
          <div key={e.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:"white", border:"1px solid #e5e7eb", borderRadius:10, marginBottom:8, borderLeft:`4px solid ${color}` }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14, color:"#111827" }}>{e.title}</div>
              <div style={{ fontSize:12, color:"#6b7280", marginTop:3, display:"flex", gap:14, flexWrap:"wrap" }}>
                <span>👤 {e.person}</span>
                {e.location && <span>📍 {e.location}</span>}
                <span>📅 {fmtDate(e.dueDate)}</span>
                <span>{getPM(e.paymentMethod).icon} {getPM(e.paymentMethod).l}</span>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:700, fontSize:16, color:"#111827" }}>{fmt(e.amount)}</div>
              <div style={{ fontSize:11, fontWeight:600, color, marginTop:2 }}>
                {days<0 ? `${Math.abs(days)}d vencido` : days===0 ? "HOJE!" : `${days}d restantes`}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <button onClick={() => onMarkPaid(e.id)} style={{ padding:"7px 14px", background:"#f59e0b", color:"white", border:"none", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:700 }}>Pagar</button>
              <button onClick={() => onEdit(e)} style={{ padding:"7px 14px", background:"#f3f4f6", color:"#374151", border:"none", borderRadius:6, cursor:"pointer", fontSize:12 }}>Editar</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <h1 style={{ margin:"0 0 6px", fontSize:22, fontWeight:700, color:"#111827" }}>Alertas</h1>
      <p style={{ margin:"0 0 28px", color:"#6b7280", fontSize:14 }}>Monitoramento de vencimentos</p>
      <Section title="Contas Vencidas"             items={overdue}  color="#ef4444" Icon={AlertTriangle} emptyMsg="Nenhuma conta vencida ✅" />
      <Section title="Vencem Hoje"                 items={dueToday} color="#f59e0b" Icon={Clock}         emptyMsg="Nada vence hoje"          />
      <Section title="Vencem em 7 Dias"            items={dueSoon}  color="#3b82f6" Icon={Calendar}      emptyMsg="Nada vence esta semana"   />
      <Section title="Próximos 30 Dias"            items={upcoming} color="#8b5cf6" Icon={Calendar}      emptyMsg="Nada nos próximos 30 dias" />
    </div>
  );
};

// ─── CATEGORIES VIEW ──────────────────────────────────────────────────────────
const CategoriesView = ({ categories, expenses, onAddCategory, onRemoveCategory }) => {
  const [name, setName]   = useState("");
  const [color, setColor] = useState("#6b7280");
  const [icon, setIcon]   = useState("📦");

  const addCat = async () => {
    if (!name.trim()) return;
    if (categories.find((c) => c.name === name.trim())) return alert("Categoria já existe.");
    try {
      await onAddCategory({ name: name.trim(), color, icon });
      setName(""); setColor("#6b7280"); setIcon("📦");
    } catch (err) {
      alert(err.message || "Erro ao criar categoria.");
    }
  };
  const removeCat = async (id, catName) => {
    if (expenses.some((e) => e.category === catName)) return alert("Categoria em uso — remova os gastos primeiro.");
    try {
      await onRemoveCategory(id);
    } catch (err) {
      alert(err.message || "Erro ao remover categoria.");
    }
  };

  return (
    <div>
      <h1 style={{ margin:"0 0 6px", fontSize:22, fontWeight:700, color:"#111827" }}>Categorias</h1>
      <p style={{ margin:"0 0 24px", color:"#6b7280", fontSize:14 }}>Gerencie as categorias de gastos</p>
      <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:12, padding:20, marginBottom:24 }}>
        <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:600 }}>Nova Categoria</h3>
        <div style={{ display:"flex", gap:12, alignItems:"flex-end" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#374151", marginBottom:4, textTransform:"uppercase" }}>Nome</div>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key==="Enter"&&addCat()} placeholder="Nome da categoria" style={{ width:"100%", padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:13, boxSizing:"border-box", outline:"none" }} />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"#374151", marginBottom:4, textTransform:"uppercase" }}>Ícone</div>
            <input value={icon} onChange={e => setIcon(e.target.value)} style={{ width:55, padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:18, textAlign:"center", outline:"none" }} />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"#374151", marginBottom:4, textTransform:"uppercase" }}>Cor</div>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width:48, height:38, padding:4, border:"1px solid #d1d5db", borderRadius:8, cursor:"pointer" }} />
          </div>
          <button onClick={addCat} style={{ padding:"8px 20px", background:"#f59e0b", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13, whiteSpace:"nowrap", height:38 }}>
            Adicionar
          </button>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:12 }}>
        {categories.map((c) => {
          const count = expenses.filter((e) => e.category === c.name).length;
          const total = expenses.filter((e) => e.category === c.name).reduce((s, e) => s + e.amount, 0);
          return (
            <div key={c.id} style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:12, padding:16, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:c.color }} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:c.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{c.icon}</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:"#111827" }}>{c.name}</div>
                    <div style={{ fontSize:11, color:"#9ca3af" }}>{count} gastos</div>
                  </div>
                </div>
                {count===0 && (
                  <button type="button" onClick={() => removeCat(c.id, c.name)} style={{ background:"none", border:"none", cursor:"pointer", color:"#d1d5db", padding:2 }}><X size={12} /></button>
                )}
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:c.color }}>{fmt(total)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── PEOPLE VIEW ──────────────────────────────────────────────────────────────
const PeopleView = ({ people, expenses, onAddPerson, onRemovePerson }) => {
  const [name, setName] = useState("");
  const COLORS = ["#f59e0b","#3b82f6","#8b5cf6","#10b981","#ec4899","#f97316"];

  const add = async () => {
    const n = name.trim();
    if (!n || people.some((p) => p.name === n)) return;
    try {
      await onAddPerson({ name: n });
      setName("");
    } catch (err) {
      alert(err.message || "Erro ao adicionar pessoa.");
    }
  };
  const remove = async (id, personName) => {
    if (expenses.some((e) => e.person === personName)) return alert("Pessoa com gastos — não pode ser removida.");
    try {
      await onRemovePerson(id);
    } catch (err) {
      alert(err.message || "Erro ao remover pessoa.");
    }
  };

  return (
    <div>
      <h1 style={{ margin:"0 0 6px", fontSize:22, fontWeight:700, color:"#111827" }}>Pessoas</h1>
      <p style={{ margin:"0 0 24px", color:"#6b7280", fontSize:14 }}>Gerencie quem realiza os gastos</p>
      <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:12, padding:20, marginBottom:24 }}>
        <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:600 }}>Adicionar Pessoa</h3>
        <div style={{ display:"flex", gap:12 }}>
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key==="Enter"&&add()} placeholder="Nome completo" style={{ flex:1, padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:13, outline:"none" }} />
          <button onClick={add} style={{ padding:"8px 20px", background:"#f59e0b", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 }}>Adicionar</button>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:16 }}>
        {people.map((p,i) => {
          const color = COLORS[i % COLORS.length];
          const all   = expenses.filter(e => e.person===p.name);
          const paid  = all.filter(e => e.status==="paid").reduce((s,e)=>s+e.amount,0);
          const pend  = all.filter(e => e.status!=="paid").reduce((s,e)=>s+e.amount,0);
          const init  = p.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
          return (
            <div key={p.id} style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:14, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:46, height:46, borderRadius:"50%", background:color+"22", color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:16 }}>{init}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:"#111827" }}>{p.name}</div>
                    <div style={{ fontSize:12, color:"#9ca3af" }}>{all.length} gastos</div>
                  </div>
                </div>
                {all.length===0 && <button type="button" onClick={()=>remove(p.id, p.name)} style={{ background:"none", border:"none", cursor:"pointer", color:"#d1d5db" }}><Trash2 size={14} /></button>}
              </div>
              <div style={{ borderTop:"1px solid #f3f4f6", paddingTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontSize:10, color:"#9ca3af", marginBottom:2, textTransform:"uppercase", fontWeight:600 }}>Total Pago</div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#10b981" }}>{fmt(paid)}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:"#9ca3af", marginBottom:2, textTransform:"uppercase", fontWeight:600 }}>A Pagar</div>
                  <div style={{ fontSize:15, fontWeight:700, color: pend>0?"#f59e0b":"#9ca3af" }}>{fmt(pend)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function buildExpensePayload(form) {
  return {
    title: form.title.trim(),
    amount: parseFloat(String(form.amount).replace(",", ".")),
    category_id: Number(form.categoryId),
    person_id: Number(form.personId),
    location: form.location?.trim() || null,
    payment_method: form.paymentMethod,
    payment_month: form.paymentMonth,
    due_date: form.dueDate || null,
    installments: Number(form.installments) || 1,
    current_installment: Number(form.currentInstallment) || 1,
    notes: form.notes?.trim() || null,
    status: form.status,
  };
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function GestorGastos() {
  const [view, setView] = useState("dashboard");
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [people, setPeople] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [alertGroups, setAlertGroups] = useState(null);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const defaultMonth = () => new Date().toISOString().slice(0, 7);
  const [dashMonth, setDashMonth] = useState(defaultMonth);
  const [fMonth, setFMonth] = useState(defaultMonth);
  const [fCat, setFCat] = useState("");
  const [fPerson, setFPerson] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSearch, setFSearch] = useState("");

  const refreshCore = useCallback(async () => {
    const [cats, pers, exps] = await Promise.all([
      api.getCategories(),
      api.getPeople(),
      api.getExpenses(),
    ]);
    setCategories(cats);
    setPeople(pers);
    const rows = exps.data ?? exps;
    setExpenses(Array.isArray(rows) ? rows.map(mapExpenseFromApi) : []);
  }, []);

  const refreshDashboard = useCallback(async (month) => {
    setDashLoading(true);
    try {
      const d = await api.getDashboard(month);
      setDashboard(d);
    } finally {
      setDashLoading(false);
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const a = await api.getAlerts();
      setAlertGroups(a);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await refreshCore();
    await Promise.all([refreshDashboard(dashMonth), refreshAlerts()]);
  }, [refreshCore, refreshDashboard, refreshAlerts, dashMonth]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setBootError(null);
      try {
        await refreshCore();
      } catch (e) {
        if (!cancelled) setBootError(e.message || "Não foi possível conectar à API.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshCore]);

  useEffect(() => {
    if (view !== "dashboard") return;
    let cancelled = false;
    (async () => {
      setDashLoading(true);
      try {
        const d = await api.getDashboard(dashMonth);
        if (!cancelled) setDashboard(d);
      } catch {
        if (!cancelled) setDashboard(null);
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [view, dashMonth]);

  useEffect(() => {
    if (view !== "alerts") return;
    let cancelled = false;
    (async () => {
      setAlertsLoading(true);
      try {
        const a = await api.getAlerts();
        if (!cancelled) setAlertGroups(a);
      } finally {
        if (!cancelled) setAlertsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [view]);

  const alertCount = useMemo(
    () => expenses.filter((e) => e.status !== "paid" && e.dueDate && getDays(e.dueDate) <= 7).length,
    [expenses],
  );

  const openAdd = () => {
    setEditing(null);
    setModal(true);
  };
  const openEdit = (e) => {
    setEditing(e);
    setModal(true);
  };

  const onSave = async (form) => {
    const payload = buildExpensePayload(form);
    try {
      if (form.id) {
        await api.updateExpense(form.id, payload);
      } else {
        await api.createExpense(payload);
      }
      await refreshAll();
      setModal(false);
    } catch (e) {
      alert(e.message || "Erro ao salvar gasto.");
    }
  };

  const onDelete = async (id) => {
    try {
      await api.deleteExpense(id);
      await refreshAll();
    } catch (e) {
      alert(e.message || "Erro ao excluir.");
    }
  };

  const onPaid = async (id) => {
    try {
      await api.markExpensePaid(id);
      await refreshAll();
    } catch (e) {
      alert(e.message || "Erro ao marcar como pago.");
    }
  };

  const onAddCategory = (body) => api.createCategory(body).then(() => refreshCore());
  const onRemoveCategory = (id) => api.deleteCategory(id).then(() => refreshCore());

  const onAddPerson = (body) => api.createPerson(body).then(() => refreshCore());
  const onRemovePerson = (id) => api.deletePerson(id).then(() => refreshCore());

  const sidebarFooter = `${monthLabel(defaultMonth())} · API Laravel`;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc", color: "#64748b", fontFamily: "system-ui, sans-serif" }}>
        Carregando dados…
      </div>
    );
  }

  if (bootError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc", padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <p style={{ color: "#b91c1c", fontWeight: 600, maxWidth: 420 }}>{bootError}</p>
        <p style={{ color: "#64748b", fontSize: 14, maxWidth: 480 }}>
          Confirme se o backend está em execução (ex.: <code>php artisan serve</code> na pasta <code>backend</code>) e se o proxy do Vite aponta para a mesma porta.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <Sidebar view={view} setView={setView} alertCount={alertCount} footerLabel={sidebarFooter} />
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {view === "dashboard" && (
          <DashboardView
            dashboard={dashboard}
            expenses={expenses}
            categories={categories}
            dashMonth={dashMonth}
            setDashMonth={setDashMonth}
            onAdd={openAdd}
            onMarkPaid={onPaid}
            loading={dashLoading}
          />
        )}
        {view === "expenses" && (
          <ExpensesView
            expenses={expenses}
            categories={categories}
            people={people}
            onEdit={openEdit}
            onDelete={onDelete}
            onMarkPaid={onPaid}
            onAdd={openAdd}
            filterMonth={fMonth}
            setFilterMonth={setFMonth}
            filterCategory={fCat}
            setFilterCategory={setFCat}
            filterPerson={fPerson}
            setFilterPerson={setFPerson}
            filterStatus={fStatus}
            setFilterStatus={setFStatus}
            searchTerm={fSearch}
            setSearchTerm={setFSearch}
          />
        )}
        {view === "alerts" && (
          <AlertsView
            overdue={alertGroups?.overdue}
            dueToday={alertGroups?.today}
            dueSoon={alertGroups?.week}
            upcoming={alertGroups?.month}
            onMarkPaid={onPaid}
            onEdit={openEdit}
            loading={alertsLoading}
          />
        )}
        {view === "categories" && (
          <CategoriesView categories={categories} expenses={expenses} onAddCategory={onAddCategory} onRemoveCategory={onRemoveCategory} />
        )}
        {view === "people" && (
          <PeopleView people={people} expenses={expenses} onAddPerson={onAddPerson} onRemovePerson={onRemovePerson} />
        )}
      </main>
      {modal && (
        <ExpenseModal
          key={editing ? String(editing.id) : "new"}
          expense={editing}
          categories={categories}
          people={people}
          onSave={onSave}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  );
}
