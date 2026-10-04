import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createMedicalRecordHandler } from '../src/mastra/medical-record/handler';
import { medicalProfile } from '../src/mastra/medical-record/profile';
import { requireUserStatement, chatOperationId } from '../src/mastra/medical-record/user-statement';
import { seedDemo, resetDemo } from '../src/mastra/seed/seed';
import { DEMO_USER_ID } from '../src/mastra/lib/demo-user';
import { getMedicalRecord, applyRecordChanges } from '../src/mastra/medical-record/store';
const db=new PGlite();
const q=async(sql:string,params:unknown[]) => (await db.query<Record<string,unknown>>(sql,params)).rows;
const userId='00000000-0000-4000-8000-000000000010', ctx={q,userId};
const handler=createMedicalRecordHandler(ctx);
const request=(path:string,body?:unknown,origin='http://localhost:4178')=>handler(new Request(`http://localhost:4178/medical-record${path}`,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)}));
before(async()=>{for(const file of(await readdir(new URL('../migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8'));await q("INSERT INTO users(id,name,is_demo) VALUES ($1,'Test',false)",[userId]);});
after(()=>db.close());
test('record routes enforce origin, shape, trusted user scope, CAS and uncached reads',async()=>{
 const input={operationId:'http-med',userStatement:'Record my reported medication',changes:[{operation:'add',entry:{kind:'medication',label:'Reported medication',clinicalStatus:'active',data:{dose:'10 mg',frequency:'daily'}}}]};
 assert.equal((await request('/change',input,'https://foreign.example')).status,403);
 assert.equal((await request('/change',{...input,userId:DEMO_USER_ID})).status,400);
 const write=await request('/change',input);assert.equal(write.status,200);const receipt=await write.json();
 const read=await request('');assert.equal(read.headers.get('cache-control'),'no-store');assert.ok((await read.json()).entries.some((e:{id:string})=>e.id===receipt.entries[0].id));
 assert.ok((await medicalProfile(ctx)).medications[0].includes('10 mg'));
 const conflict=await request('/change',{operationId:'wrong',userStatement:'Correct it',changes:[{operation:'retract',id:receipt.entries[0].id,expectedVersion:2,reason:'mistake'}]});assert.equal(conflict.status,409);
 await request('/change',{operationId:'remove-http',userStatement:'Remove it',changes:[{operation:'retract',id:receipt.entries[0].id,expectedVersion:1,reason:'mistake'}]});assert.deepEqual((await medicalProfile(ctx)).medications,[]);
});
test('document import is conversation-scoped, reviewed facts persist after source chat deletion',async()=>{
 await q("INSERT INTO conversations(user_id,id,title) VALUES ($1,'00000000-0000-4000-8000-000000000011','Mine'),($1,'00000000-0000-4000-8000-000000000012','Other')",[userId]);
 await q("INSERT INTO records(user_id,id,name,source,format,content,size_bytes,conversation_id) VALUES ($1,'upload:test','visit.txt','upload','txt','Penicillin allergy: rash.',24,'00000000-0000-4000-8000-000000000011')",[userId]);
 assert.equal((await request('/import',{id:'upload:test',conversationId:'00000000-0000-4000-8000-000000000012'})).status,404);
 const imported=await request('/import',{id:'upload:test',conversationId:'00000000-0000-4000-8000-000000000011'});assert.equal(imported.status,200);const doc=await imported.json();
 const proposal=await request('/proposals',{documentId:doc.id,changes:[{change:{operation:'add',entry:{kind:'allergy',label:'Penicillin',clinicalStatus:'active',data:{reaction:'rash'}}},quote:'Penicillin allergy: rash.'}]});assert.equal(proposal.status,200);const proposed=await proposal.json();
 assert.deepEqual((await medicalProfile(ctx)).allergies,[]);
 const review=await request('/review',{id:proposed.id,decision:'accept'});assert.equal(review.status,200);
 await q("DELETE FROM records WHERE user_id=$1 AND id='upload:test'",[userId]);await q("DELETE FROM conversations WHERE user_id=$1 AND id='00000000-0000-4000-8000-000000000011'",[userId]);
 const document=await handler(new Request(`http://localhost:4178/medical-record/document?id=${doc.id}`));assert.equal((await document.json()).text,'Penicillin allergy: rash.');assert.ok((await medicalProfile(ctx)).allergies[0].includes('rash'));
});
test('chat writes require a verbatim statement in latest normalized user message',()=>{
 requireUserStatement('Record my allergy',[{role:'user',content:{format:2,parts:[{type:'text',text:'Record my allergy to penicillin.'}]}}]);
 requireUserStatement('Record my allergy',[{role:'user',content:[{type:'text',text:'Record my allergy'}]}]);
 assert.throws(()=>requireUserStatement('document instructions',[{role:'user',content:'Review this file'},{role:'tool',content:'document instructions'}]));
 assert.throws(()=>requireUserStatement('Record my allergy',[{role:'user',content:'Record my allergy'},{role:'user',content:'What did you change?'}]));
});
test('demo reset clears canonical record, evidence and audit without touching another user',async()=>{
 await seedDemo(q);const demo={q,userId:DEMO_USER_ID};const first=await getMedicalRecord(demo);const entry=first.entries.find(e=>e.content.kind==='medication')!;
 await applyRecordChanges({operationId:'demo-retract',userStatement:'Remove sample medication',changes:[{operation:'retract',id:entry.id,expectedVersion:entry.version,reason:'reset test'}]},demo);
 const foreign=await getMedicalRecord(ctx);await resetDemo(q);const reset=await getMedicalRecord(demo);assert.equal(reset.revision,0);assert.equal(reset.history.length,0);assert.ok(reset.entries.some(e=>e.content.kind==='medication'));assert.deepEqual(await getMedicalRecord(ctx),foreign);
});

test('partial demographics preserve known fields and clinical notes in canonical projections',async()=>{
 await applyRecordChanges({operationId:'pronouns',userStatement:'Record my pronouns',changes:[{operation:'add',entry:{kind:'demographics',label:'Pronouns',clinicalStatus:'active',notes:'User supplied context',data:{pronouns:'they/them'}}}]},ctx);
 const profile=await medicalProfile(ctx);assert.equal(profile.name,'Test');assert.match(profile.notes,/User supplied context/);
});

test('stable chat message retry nonce prevents duplicate adds across model runs',async()=>{
 const context={requestContext:{get:(key:string)=>key==='medicalUpdateMessageId'?'stable-message':key==='conversationId'?'stable-conversation':undefined}};
 const firstId=chatOperationId('model-first',context),secondId=chatOperationId('model-second',context);assert.equal(firstId,secondId);
 const input={userStatement:'Record this history',changes:[{operation:'add' as const,entry:{kind:'condition' as const,label:'Reported history',clinicalStatus:'historical' as const,data:{}}}]};
 const first=await applyRecordChanges({...input,operationId:firstId},ctx),retry=await applyRecordChanges({...input,operationId:secondId},ctx);assert.deepEqual(first,retry);
 await assert.rejects(applyRecordChanges({...input,operationId:secondId,userStatement:'Different reinterpretation'},ctx),/conflict/i);
 assert.equal(chatOperationId('direct-operation'), 'direct-operation');
});
