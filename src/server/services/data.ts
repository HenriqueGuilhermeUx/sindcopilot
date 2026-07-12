import { supabaseAdmin } from "../core/supabase";
import { forbidden, notFound, serviceUnavailable } from "../core/errors";
import type { ContextUser } from "../core/context";

export type Access = Pick<ContextUser, "id" | "accountOwnerId" | "accountRole" | "allowedCondominiumIds">;

function camelKey(key: string) { return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
export function camel<T = any>(value: any): T {
  if (Array.isArray(value)) return value.map(camel) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [camelKey(k), camel(v)])) as T;
  }
  return value as T;
}

function throwDb(error: any): never {
  console.error("[Database]", error);
  throw serviceUnavailable(error?.message || "Erro no banco de dados");
}

export async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
  if (error) throwDb(error);
  return camel(data);
}

export async function updateProfile(userId: string, input: Record<string, unknown>) {
  const map: Record<string, string> = {
    name: "name", phone: "phone", cpf: "cpf", creci: "creci", company: "company",
    profileCompleted: "profile_completed", lgpdConsentAt: "lgpd_consent_at",
    lgpdConsentVersion: "lgpd_consent_version", termsAcceptedAt: "terms_accepted_at",
  };
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) if (map[key]) payload[map[key]] = value instanceof Date ? value.toISOString() : value;
  const { error } = await supabaseAdmin.from("users").update(payload).eq("id", userId);
  if (error) throwDb(error);
}

export async function listCondominiums(access: Access) {
  let query = supabaseAdmin.from("condominiums").select("*").eq("user_id", access.accountOwnerId).order("name");
  if (access.allowedCondominiumIds?.length) query = query.in("id", access.allowedCondominiumIds);
  const { data, error } = await query;
  if (error) throwDb(error);
  return camel(data || []);
}

export async function assertCondominium(access: Access, condominiumId: number, write = false) {
  if (write && access.accountRole === "viewer") throw forbidden("Seu acesso é somente leitura");
  const { data, error } = await supabaseAdmin.from("condominiums").select("*").eq("id", condominiumId).eq("user_id", access.accountOwnerId).maybeSingle();
  if (error) throwDb(error);
  if (!data) throw notFound("Condomínio não encontrado");
  if (access.allowedCondominiumIds?.length && !access.allowedCondominiumIds.includes(Number(condominiumId))) throw forbidden();
  return camel(data);
}

export async function countCondominiums(ownerId: string) {
  const { count, error } = await supabaseAdmin.from("condominiums").select("id", { count: "exact", head: true }).eq("user_id", ownerId);
  if (error) throwDb(error);
  return count || 0;
}

export async function createCondominium(ownerId: string, input: Record<string, unknown>) {
  const payload = {
    user_id: ownerId, name: input.name, cnpj: input.cnpj || null, address: input.address || null,
    city: input.city || null, state: input.state || null, zip_code: input.zipCode || null,
    phone: input.phone || null, email: input.email || null, notes: input.notes || null,
  };
  const { data, error } = await supabaseAdmin.from("condominiums").insert(payload).select("id").single();
  if (error) throwDb(error);
  return Number(data.id);
}

export async function updateCondominium(access: Access, id: number, input: Record<string, unknown>) {
  await assertCondominium(access, id, true);
  const payload: Record<string, unknown> = {};
  const keys: Record<string, string> = { name:"name",cnpj:"cnpj",address:"address",city:"city",state:"state",zipCode:"zip_code",phone:"phone",email:"email",notes:"notes",status:"status" };
  for (const [k,v] of Object.entries(input)) if (keys[k]) payload[keys[k]] = v;
  const { error } = await supabaseAdmin.from("condominiums").update(payload).eq("id", id).eq("user_id", access.accountOwnerId);
  if (error) throwDb(error);
}

export async function deleteCondominium(access: Access, id: number) {
  await assertCondominium(access, id, true);
  const { error } = await supabaseAdmin.from("condominiums").delete().eq("id", id).eq("user_id", access.accountOwnerId);
  if (error) throwDb(error);
}

export async function listUnits(access: Access, condominiumId: number) {
  await assertCondominium(access, condominiumId);
  const { data, error } = await supabaseAdmin.from("units").select("*").eq("condominium_id", condominiumId).order("number");
  if (error) throwDb(error);
  return camel(data || []);
}

export async function getUnit(access: Access, id: number) {
  const { data, error } = await supabaseAdmin.from("units").select("*,condominiums!inner(user_id)").eq("id", id).maybeSingle();
  if (error) throwDb(error);
  if (!data || data.condominiums?.user_id !== access.accountOwnerId) throw notFound("Unidade não encontrada");
  await assertCondominium(access, Number(data.condominium_id));
  const { condominiums: _c, ...unit } = data;
  return camel(unit);
}

export async function createUnit(access: Access, input: Record<string, any>) {
  await assertCondominium(access, Number(input.condominiumId), true);
  const payload = {
    condominium_id: input.condominiumId, number: input.number, block: input.block || null, floor: input.floor || null,
    owner_name: input.ownerName || null, owner_phone: input.ownerPhone || null, owner_email: input.ownerEmail || null,
    resident_name: input.residentName || null, resident_phone: input.residentPhone || null, resident_email: input.residentEmail || null,
    notes: input.notes || null,
  };
  const { data, error } = await supabaseAdmin.from("units").insert(payload).select("id").single();
  if (error) throwDb(error);
  return Number(data.id);
}

export async function updateUnit(access: Access, id: number, input: Record<string, unknown>) {
  const unit = await getUnit(access, id); await assertCondominium(access, Number((unit as any).condominiumId), true);
  const map: Record<string,string>={number:"number",block:"block",floor:"floor",ownerName:"owner_name",ownerPhone:"owner_phone",ownerEmail:"owner_email",residentName:"resident_name",residentPhone:"resident_phone",residentEmail:"resident_email",notes:"notes"};
  const payload: Record<string,unknown>={}; for(const[k,v]of Object.entries(input)) if(map[k]) payload[map[k]]=v;
  const { error }=await supabaseAdmin.from("units").update(payload).eq("id",id); if(error)throwDb(error);
}
export async function deleteUnit(access: Access,id:number){const unit=await getUnit(access,id);await assertCondominium(access,Number((unit as any).condominiumId),true);const{error}=await supabaseAdmin.from("units").delete().eq("id",id);if(error)throwDb(error);}

export async function listDocuments(access: Access, condominiumId?: number, type?: string) {
  if (condominiumId) await assertCondominium(access, condominiumId);
  let q = supabaseAdmin.from("documents").select("*").eq("user_id", access.accountOwnerId).order("created_at", { ascending:false }).limit(100);
  if (condominiumId) q=q.eq("condominium_id",condominiumId); if(type) q=q.eq("type",type);
  if (access.allowedCondominiumIds?.length) q=q.in("condominium_id",access.allowedCondominiumIds);
  const {data,error}=await q;if(error)throwDb(error);return camel(data||[]);
}
export async function getDocument(access:Access,id:number){const{data,error}=await supabaseAdmin.from("documents").select("*").eq("id",id).eq("user_id",access.accountOwnerId).maybeSingle();if(error)throwDb(error);if(!data)throw notFound("Documento não encontrado");await assertCondominium(access,Number(data.condominium_id));return camel(data);}
export async function createDocument(access:Access,input:Record<string,any>){await assertCondominium(access,Number(input.condominiumId),true);const now=new Date();const payload={condominium_id:input.condominiumId,user_id:access.accountOwnerId,type:input.type,title:input.title||input.fileName,description:input.description||null,file_key:input.fileKey,file_name:input.fileName,mime_type:input.mimeType,size_bytes:input.sizeBytes,year:now.getFullYear(),month:now.getMonth()+1,ocr_status:input.ocrStatus||"not_required",indexing_status:input.indexingStatus||"not_required"};const{data,error}=await supabaseAdmin.from("documents").insert(payload).select("id").single();if(error)throwDb(error);return Number(data.id);}
export async function updateDocument(access:Access,id:number,input:Record<string,unknown>){await getDocument(access,id);const map:Record<string,string>={ocrSupplierName:"ocr_supplier_name",ocrSupplierCnpj:"ocr_supplier_cnpj",ocrValueCents:"ocr_value_cents",ocrDate:"ocr_date",ocrCategory:"ocr_category",ocrSummary:"ocr_summary",ocrStatus:"ocr_status",indexingStatus:"indexing_status",indexingError:"indexing_error",textContent:"text_content",pageCount:"page_count",status:"status"};const payload:Record<string,unknown>={};for(const[k,v]of Object.entries(input))if(map[k])payload[map[k]]=v instanceof Date?v.toISOString():v;const{error}=await supabaseAdmin.from("documents").update(payload).eq("id",id).eq("user_id",access.accountOwnerId);if(error)throwDb(error);}
export async function deleteDocument(access:Access,id:number){const doc:any=await getDocument(access,id);await assertCondominium(access,doc.condominiumId,true);const{error}=await supabaseAdmin.from("documents").delete().eq("id",id).eq("user_id",access.accountOwnerId);if(error)throwDb(error);return doc;}
export async function listLegalDocuments(access:Access,condominiumId:number){await assertCondominium(access,condominiumId);const{data,error}=await supabaseAdmin.from("documents").select("*").eq("user_id",access.accountOwnerId).eq("condominium_id",condominiumId).in("type",["convencao","regimento","ata"]).order("created_at",{ascending:false});if(error)throwDb(error);return camel(data||[]);}

export async function listObligations(access:Access,condominiumId?:number){if(condominiumId)await assertCondominium(access,condominiumId);let q=supabaseAdmin.from("obligations").select("*,condominiums(name)").eq("user_id",access.accountOwnerId).order("due_date");if(condominiumId)q=q.eq("condominium_id",condominiumId);if(access.allowedCondominiumIds?.length)q=q.in("condominium_id",access.allowedCondominiumIds);const{data,error}=await q;if(error)throwDb(error);return (data||[]).map((r:any)=>({obligation:camel(Object.fromEntries(Object.entries(r).filter(([k])=>k!=="condominiums"))),condominiumName:r.condominiums?.name||""}));}
export async function createObligation(access:Access,input:Record<string,any>){await assertCondominium(access,Number(input.condominiumId),true);const payload={condominium_id:input.condominiumId,user_id:access.accountOwnerId,title:input.title,description:input.description||null,category:input.category,due_date:new Date(input.dueDate).toISOString(),alert_days_before:input.alertDaysBefore??30,is_recurring:input.isRecurring??false,recurring_months:input.recurringMonths||null,status:"pending",notes:input.notes||null};const{data,error}=await supabaseAdmin.from("obligations").insert(payload).select("id").single();if(error)throwDb(error);return Number(data.id);}
export async function getObligation(access:Access,id:number){const{data,error}=await supabaseAdmin.from("obligations").select("*").eq("id",id).eq("user_id",access.accountOwnerId).maybeSingle();if(error)throwDb(error);if(!data)throw notFound("Obrigação não encontrada");await assertCondominium(access,Number(data.condominium_id));return camel(data);}
export async function updateObligation(access:Access,id:number,input:Record<string,any>){const current:any=await getObligation(access,id);await assertCondominium(access,current.condominiumId,true);const map:Record<string,string>={title:"title",description:"description",category:"category",dueDate:"due_date",alertDaysBefore:"alert_days_before",isRecurring:"is_recurring",recurringMonths:"recurring_months",status:"status",notes:"notes",completedAt:"completed_at"};const payload:Record<string,unknown>={};for(const[k,v]of Object.entries(input))if(map[k])payload[map[k]]=v instanceof Date?v.toISOString():v;const{error}=await supabaseAdmin.from("obligations").update(payload).eq("id",id).eq("user_id",access.accountOwnerId);if(error)throwDb(error);return current;}
export async function deleteObligation(access:Access,id:number){const current:any=await getObligation(access,id);await assertCondominium(access,current.condominiumId,true);const{error}=await supabaseAdmin.from("obligations").delete().eq("id",id).eq("user_id",access.accountOwnerId);if(error)throwDb(error);}

export async function listNotices(access:Access,condominiumId:number){await assertCondominium(access,condominiumId);const{data,error}=await supabaseAdmin.from("notices").select("*").eq("user_id",access.accountOwnerId).eq("condominium_id",condominiumId).order("created_at",{ascending:false});if(error)throwDb(error);return camel(data||[]);}
export async function getNotice(access:Access,id:number){const{data,error}=await supabaseAdmin.from("notices").select("*").eq("id",id).eq("user_id",access.accountOwnerId).maybeSingle();if(error)throwDb(error);if(!data)throw notFound("Minuta não encontrada");await assertCondominium(access,Number(data.condominium_id));return camel(data);}
export async function createNotice(access:Access,input:Record<string,any>){await assertCondominium(access,Number(input.condominiumId),true);if(input.unitId)await getUnit(access,Number(input.unitId));const payload={condominium_id:input.condominiumId,user_id:access.accountOwnerId,unit_id:input.unitId||null,type:input.type,subject:input.subject,description:input.description||null,generated_content:input.generatedContent||null,legal_basis:input.legalBasis||null,source_refs:input.sourceRefs||[],warning:input.warning||null,status:input.status||"draft"};const{data,error}=await supabaseAdmin.from("notices").insert(payload).select("id").single();if(error)throwDb(error);return Number(data.id);}
export async function updateNotice(access:Access,id:number,input:Record<string,any>){const current:any=await getNotice(access,id);await assertCondominium(access,current.condominiumId,true);const map:Record<string,string>={status:"status",generatedContent:"generated_content",sentAt:"sent_at"};const payload:Record<string,unknown>={};for(const[k,v]of Object.entries(input))if(map[k])payload[map[k]]=v instanceof Date?v.toISOString():v;const{error}=await supabaseAdmin.from("notices").update(payload).eq("id",id).eq("user_id",access.accountOwnerId);if(error)throwDb(error);}
export async function deleteNotice(access:Access,id:number){const n:any=await getNotice(access,id);await assertCondominium(access,n.condominiumId,true);const{error}=await supabaseAdmin.from("notices").delete().eq("id",id).eq("user_id",access.accountOwnerId);if(error)throwDb(error);}

export async function listSuppliers(access:Access){const{data,error}=await supabaseAdmin.from("suppliers").select("*").eq("user_id",access.accountOwnerId).order("name");if(error)throwDb(error);return camel(data||[]);}
export async function createSupplier(access:Access,input:Record<string,any>){if(access.accountRole==="viewer")throw forbidden();const{data,error}=await supabaseAdmin.from("suppliers").insert({user_id:access.accountOwnerId,name:input.name,cnpj:input.cnpj||null,category:input.category||null,phone:input.phone||null,email:input.email||null,address:input.address||null,rating:input.rating||null,notes:input.notes||null}).select("id").single();if(error)throwDb(error);return Number(data.id);}
export async function updateSupplier(access:Access,id:number,input:Record<string,any>){if(access.accountRole==="viewer")throw forbidden();const map:Record<string,string>={name:"name",cnpj:"cnpj",category:"category",phone:"phone",email:"email",address:"address",rating:"rating",notes:"notes"};const payload:Record<string,unknown>={};for(const[k,v]of Object.entries(input))if(map[k])payload[map[k]]=v;const{data,error}=await supabaseAdmin.from("suppliers").update(payload).eq("id",id).eq("user_id",access.accountOwnerId).select("id").maybeSingle();if(error)throwDb(error);if(!data)throw notFound("Fornecedor não encontrado");}
export async function deleteSupplier(access:Access,id:number){if(access.accountRole==="viewer")throw forbidden();const{data,error}=await supabaseAdmin.from("suppliers").delete().eq("id",id).eq("user_id",access.accountOwnerId).select("id").maybeSingle();if(error)throwDb(error);if(!data)throw notFound("Fornecedor não encontrado");}

export async function createActivity(access:Access,input:Record<string,any>){const{error}=await supabaseAdmin.from("activities").insert({user_id:access.accountOwnerId,actor_user_id:access.id,condominium_id:input.condominiumId||null,type:input.type,title:input.title,description:input.description||null});if(error)console.error("[Activity]",error);}
export async function listActivities(access:Access,limit=30){let q=supabaseAdmin.from("activities").select("*,condominiums(name)").eq("user_id",access.accountOwnerId).order("created_at",{ascending:false}).limit(Math.min(limit,100));if(access.allowedCondominiumIds?.length)q=q.or(`condominium_id.is.null,condominium_id.in.(${access.allowedCondominiumIds.join(",")})`);const{data,error}=await q;if(error)throwDb(error);return(data||[]).map((r:any)=>({activity:camel(Object.fromEntries(Object.entries(r).filter(([k])=>k!=="condominiums"))),condominiumName:r.condominiums?.name||null}));}

export async function createChatMessage(access:Access,input:Record<string,any>){const{error}=await supabaseAdmin.from("chat_messages").insert({user_id:access.accountOwnerId,actor_user_id:access.id,condominium_id:input.condominiumId||null,role:input.role,content:input.content,citations:input.citations||[]});if(error)throwDb(error);}
export async function listChatMessages(access:Access,condominiumId?:number,limit=100){if(condominiumId)await assertCondominium(access,condominiumId);let q=supabaseAdmin.from("chat_messages").select("*").eq("user_id",access.accountOwnerId).order("created_at",{ascending:false}).limit(Math.min(limit,100));if(condominiumId)q=q.eq("condominium_id",condominiumId);else q=q.is("condominium_id",null);const{data,error}=await q;if(error)throwDb(error);return camel((data||[]).reverse());}
export async function clearChatMessages(access:Access,condominiumId?:number){if(access.accountRole==="viewer")throw forbidden();let q=supabaseAdmin.from("chat_messages").delete().eq("user_id",access.accountOwnerId);q=condominiumId?q.eq("condominium_id",condominiumId):q.is("condominium_id",null);const{error}=await q;if(error)throwDb(error);}

export async function dashboardStats(access:Access){const condos=await listCondominiums(access);const ids=condos.map((c:any)=>c.id);if(!ids.length)return{totalCondominiums:0,totalUnits:0,pendingDocuments:0,upcomingObligations:0};const now=new Date();const future=new Date(Date.now()+30*86400000);const [u,d,o]=await Promise.all([
  supabaseAdmin.from("units").select("id",{count:"exact",head:true}).in("condominium_id",ids),
  supabaseAdmin.from("documents").select("id",{count:"exact",head:true}).eq("user_id",access.accountOwnerId).eq("status","pending").in("condominium_id",ids),
  supabaseAdmin.from("obligations").select("id",{count:"exact",head:true}).eq("user_id",access.accountOwnerId).in("status",["pending","upcoming"]).gte("due_date",now.toISOString()).lte("due_date",future.toISOString()).in("condominium_id",ids),
]);if(u.error)throwDb(u.error);if(d.error)throwDb(d.error);if(o.error)throwDb(o.error);return{totalCondominiums:condos.length,totalUnits:u.count||0,pendingDocuments:d.count||0,upcomingObligations:o.count||0};}

export async function globalSearch(access:Access,query:string){const q=`%${query}%`;const condos=await listCondominiums(access);const ids=condos.map((c:any)=>c.id);const [docs,supp,unitsResult]=await Promise.all([
  supabaseAdmin.from("documents").select("*").eq("user_id",access.accountOwnerId).or(`title.ilike.${q},ocr_supplier_name.ilike.${q}`).limit(5),
  supabaseAdmin.from("suppliers").select("*").eq("user_id",access.accountOwnerId).or(`name.ilike.${q},category.ilike.${q}`).limit(5),
  ids.length?supabaseAdmin.from("units").select("*").in("condominium_id",ids).or(`number.ilike.${q},owner_name.ilike.${q},resident_name.ilike.${q}`).limit(5):Promise.resolve({data:[],error:null}),
]);if(docs.error)throwDb(docs.error);if(supp.error)throwDb(supp.error);if(unitsResult.error)throwDb(unitsResult.error);return{condominiums:condos.filter((c:any)=>[c.name,c.cnpj].some(v=>String(v||"").toLowerCase().includes(query.toLowerCase()))).slice(0,5),documents:camel(docs.data||[]),suppliers:camel(supp.data||[]),units:camel(unitsResult.data||[])};}

export async function listAssistants(ownerId:string){const{data,error}=await supabaseAdmin.from("assistants").select("*").eq("owner_id",ownerId).order("created_at",{ascending:false});if(error)throwDb(error);return camel(data||[]);}
export async function countActiveAssistants(ownerId:string){const{count,error}=await supabaseAdmin.from("assistants").select("id",{count:"exact",head:true}).eq("owner_id",ownerId).neq("status","revoked");if(error)throwDb(error);return count||0;}
export async function createAssistant(ownerId:string,input:Record<string,any>){const payload={owner_id:ownerId,email:String(input.email).toLowerCase(),name:input.name||null,phone:input.phone||null,invite_token:input.token,role:input.role||"assistant",allowed_condominium_ids:input.allowedCondominiumIds?.length?input.allowedCondominiumIds:null,status:"pending",expires_at:new Date(Date.now()+7*86400000).toISOString()};const{data,error}=await supabaseAdmin.from("assistants").upsert(payload,{onConflict:"owner_id,email"}).select("id").single();if(error)throwDb(error);return Number(data.id);}
export async function getInvite(token:string){const{data,error}=await supabaseAdmin.from("assistants").select("*,users!assistants_owner_id_fkey(name,company)").eq("invite_token",token).maybeSingle();if(error)throwDb(error);if(!data||data.status!=="pending"||new Date(data.expires_at)<new Date())throw notFound("Convite inválido ou expirado");return camel(data);}
export async function acceptInvite(token:string,userId:string,email:string|null){const invite:any=await getInvite(token);if(email&&invite.email.toLowerCase()!==email.toLowerCase())throw forbidden("Entre com o mesmo email que recebeu o convite");const{error}=await supabaseAdmin.from("assistants").update({status:"active",user_id:userId,accepted_at:new Date().toISOString()}).eq("invite_token",token).eq("status","pending");if(error)throwDb(error);const{error:profileError}=await supabaseAdmin.from("users").update({account_owner_id:invite.ownerId,account_role:invite.role}).eq("id",userId);if(profileError)throwDb(profileError);return invite;}
export async function updateAssistant(ownerId:string,id:number,input:Record<string,any>){const payload:Record<string,unknown>={};if(input.status)payload.status=input.status;if(input.role)payload.role=input.role;if(input.allowedCondominiumIds!==undefined)payload.allowed_condominium_ids=input.allowedCondominiumIds?.length?input.allowedCondominiumIds:null;const{data,error}=await supabaseAdmin.from("assistants").update(payload).eq("id",id).eq("owner_id",ownerId).select("user_id").maybeSingle();if(error)throwDb(error);if(!data)throw notFound("Ajudante não encontrado");if(input.status==="revoked"&&data.user_id){await supabaseAdmin.from("users").update({account_owner_id:null,account_role:"owner"}).eq("id",data.user_id);}}
export async function deleteAssistant(ownerId:string,id:number){const{data,error}=await supabaseAdmin.from("assistants").delete().eq("id",id).eq("owner_id",ownerId).select("user_id").maybeSingle();if(error)throwDb(error);if(!data)throw notFound("Ajudante não encontrado");if(data.user_id)await supabaseAdmin.from("users").update({account_owner_id:null,account_role:"owner"}).eq("id",data.user_id);}
