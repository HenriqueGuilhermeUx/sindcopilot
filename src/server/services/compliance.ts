import { supabaseAdmin } from "../core/supabase";
import { sendEmail, escapeHtml } from "./email";

const DAY = 86400000;
function daysUntil(date: string) { return Math.ceil((new Date(date).getTime() - Date.now()) / DAY); }

export async function runComplianceSweep() {
  const horizon = new Date(Date.now()+365*DAY).toISOString();
  const { data: obligations, error } = await supabaseAdmin
    .from("obligations")
    .select("*,condominiums(name),users(email,name)")
    .neq("status","completed")
    .lte("due_date",horizon);
  if (error) throw new Error(error.message);
  let updated=0, alerts=0, failures=0;
  for (const row of obligations || []) {
    const days = daysUntil(row.due_date);
    const status = days < 0 ? "overdue" : days <= Number(row.alert_days_before || 30) ? "upcoming" : "pending";
    if (row.status !== status) {
      await supabaseAdmin.from("obligations").update({status}).eq("id",row.id); updated++;
    }
    const alertDays = [Number(row.alert_days_before||30),15,7,1,0].filter((v,i,a)=>v>=0&&a.indexOf(v)===i).sort((a,b)=>b-a);
    const alertKey = days < 0 ? "overdue" : alertDays.includes(days) ? `d-${days}` : null;
    if (!alertKey) continue;
    const dueDate = new Date(row.due_date).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"});
    const { data: alert, error: alertError } = await supabaseAdmin.from("compliance_alerts").insert({obligation_id:row.id,due_date:row.due_date,alert_key:alertKey,recipient:row.users?.email||null}).select("id").maybeSingle();
    if (alertError?.code === "23505") continue;
    if (alertError) { failures++; continue; }
    try {
      if (row.users?.email) {
        await sendEmail({
          to: row.users.email,
          subject: days < 0 ? `Obrigação vencida: ${row.title}` : `Obrigação vence em ${days} dia(s): ${row.title}`,
          html: `<h2>SindCopilot — Alerta de compliance</h2><p><strong>${escapeHtml(row.title)}</strong></p><p>Condomínio: ${escapeHtml(row.condominiums?.name||"")}</p><p>Vencimento: ${dueDate}</p><p>${days<0?`Vencida há ${Math.abs(days)} dia(s).`:`Faltam ${days} dia(s).`}</p>`,
        });
        await supabaseAdmin.from("compliance_alerts").update({delivery_status:"sent",sent_at:new Date().toISOString()}).eq("id",alert?.id); alerts++;
      } else {
        await supabaseAdmin.from("compliance_alerts").update({delivery_status:"skipped",error_message:"Usuário sem email"}).eq("id",alert?.id);
      }
    } catch (e:any) {
      failures++; await supabaseAdmin.from("compliance_alerts").update({delivery_status:"failed",error_message:e?.message||"Falha"}).eq("id",alert?.id);
    }
  }
  return { scanned: obligations?.length||0, updated, alerts, failures };
}
