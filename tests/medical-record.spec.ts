import { expect, test, type Page } from '@playwright/test';
import type { MedicalRecord } from '../src/shared/medical-record';
const entry={id:'sample-allergy',version:1,status:'current' as const,content:{kind:'allergy' as const,label:'Penicillin',clinicalStatus:'active' as const,data:{reaction:'rash'}},provenance:{type:'legacy_demo' as const},createdAt:'2026-10-04T10:00:00Z',updatedAt:'2026-10-04T10:00:00Z'};
function fixture():MedicalRecord{return {revision:0,demo:true,entries:[entry],documents:[{id:'source',name:'Clinic visit.pdf',mimeType:'application/pdf',origin:{type:'computer',locator:'/workspace/visit.pdf'},sha256:'sample',createdAt:'2026-10-04T10:00:00Z'}],proposals:[{id:'proposal',documentId:'source',status:'pending',createdAt:'2026-10-04T10:00:00Z',changes:[{change:{operation:'add',entry:{kind:'condition',label:'Reported asthma',clinicalStatus:'active',data:{verification:'documented'}}},quote:'History: asthma.'}]}],history:[]};}
async function setup(page:Page,state:MedicalRecord){
 await page.route('**/care-state',r=>r.fulfill({json:{state:null,revision:0}}));
 await page.route('**/conversations',r=>r.fulfill({json:{conversations:[]}}));
 await page.route('**/health/**',r=>r.fulfill({json:{name:'Test',onboarded:true,goals:{steps:5000,activeMinutes:20},notifications:'off',connected:false}}));
 await page.route('**/medical-record',r=>r.fulfill({json:state}));
 await page.goto('/');const mobile = await page.getByRole('button',{name:'Open navigation'}).isVisible();await page.getByRole('navigation',{name:mobile?'Main navigation':'Desktop navigation'}).getByRole('button',{name:'Talk',exact:true}).click();await expect(page.getByRole('textbox',{name:'Message Baymax'})).toBeVisible();
 if(await page.getByRole('button',{name:'Open navigation'}).isVisible()) await page.getByRole('button',{name:'Open navigation'}).click();
 await page.getByRole('button',{name:'Medical record',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your health. In one place.'})).toBeVisible();
}
test('desktop record shows sources, unknown sections and reviewed facts/history',async({page})=>{
 await page.setViewportSize({width:1440,height:1050});const state=fixture();await setup(page,state);
 await expect(page.getByText('Medical record · stored on server')).toBeVisible();await expect(page.getByRole('note')).toContainText('synthetic');await expect(page.getByRole('heading',{name:'Penicillin',exact:true})).toBeVisible();await expect(page.getByText('Nothing recorded yet. This means unknown, not confirmed absent.').first()).toBeVisible();
 await page.getByRole('button',{name:'Review 1',exact:true}).click();await expect(page.getByText('History: asthma.',{exact:true})).toBeVisible();await expect(page.getByText('Verification',{exact:true})).toBeVisible();
 await page.route('**/medical-record/review',async route=>{expect(route.request().postDataJSON()).toEqual({id:'proposal',decision:'accept'});const saved={...entry,id:'new-condition',content:state.proposals[0].changes[0].change.operation==='add'?state.proposals[0].changes[0].change.entry:entry.content,provenance:{type:'document' as const,documentId:'source',quote:'History: asthma.'}};state.entries.push(saved);state.proposals[0].status='accepted';state.history.push({id:'event',entryId:saved.id,operationId:'proposal:proposal',operation:'add',before:null,after:saved,createdAt:saved.createdAt});state.revision=1;await route.fulfill({json:{receipt:{operationId:'proposal:proposal',revision:1,entries:[saved]}}});});
 await page.getByRole('button',{name:'Accept changes'}).click();await expect(page.getByRole('status').filter({hasText:'Changes saved'})).toBeVisible();await expect(page.getByRole('heading',{name:'All caught up.'})).toBeVisible();
 await page.getByRole('button',{name:'Record',exact:true}).click();await expect(page.getByRole('heading',{name:'Reported asthma',exact:true})).toBeVisible();await page.getByText('Source excerpt · Clinic visit.pdf').click();await expect(page.getByText('History: asthma.',{exact:true})).toBeVisible();
 await page.evaluate(() => window.scrollTo(0, 0));
 await page.screenshot({path:'/tmp/baymax-medical-record-desktop.png',fullPage:false,scale:'css'});
 await page.getByRole('button',{name:'Edit history'}).click();await expect(page.getByRole('heading',{name:'Added Reported asthma'})).toBeVisible();
});
test('mobile review rejects proposals and has no horizontal overflow',async({page})=>{
 const state=fixture();await setup(page,state);await page.getByRole('button',{name:'Review 1',exact:true}).click();
 await page.route('**/medical-record/review',async route=>{expect(route.request().postDataJSON().decision).toBe('reject');state.proposals[0].status='rejected';await route.fulfill({json:{receipt:null}});});
 await page.getByRole('button',{name:'Reject',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Proposal rejected'})).toBeVisible();expect(state.entries.length).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Record',exact:true}).click();await page.evaluate(() => window.scrollTo(0, 0));await page.screenshot({path:'/tmp/baymax-medical-record-mobile.png',fullPage:false,scale:'css'});
 await page.getByRole('button',{name:'Update with Baymax'}).click();await expect(page.getByRole('textbox',{name:'Message Baymax'})).toBeVisible();
});
test('stale proposal errors remain visible without claiming saved changes',async({page})=>{
 const state=fixture();await setup(page,state);await page.getByRole('button',{name:'Review 1',exact:true}).click();await page.route('**/medical-record/review',r=>r.fulfill({status:409,json:{error:'conflict'}}));await page.getByRole('button',{name:'Accept changes'}).click();await expect(page.getByRole('alert')).toContainText('Your record changed');await expect(page.getByRole('button',{name:'Accept changes'})).toBeEnabled();expect(state.proposals[0].status).toBe('pending');
});
