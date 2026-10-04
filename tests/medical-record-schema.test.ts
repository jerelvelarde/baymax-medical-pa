import {test} from 'node:test';
import assert from 'node:assert/strict';
import {entryContentSchema, documentInputSchema, recordChangeSchema} from '../src/shared/medical-record';
test('structured record validates clinical types without inventing unknowns',()=>{
 const allergy=entryContentSchema.parse({kind:'allergy',label:'Penicillin',clinicalStatus:'active',data:{reaction:'rash'}});
 assert.equal(allergy.data.reaction,'rash'); assert.equal('severity' in allergy.data,false);
 assert.equal(entryContentSchema.safeParse({kind:'observation',label:'Blood pressure',clinicalStatus:'active',effectiveDate:'2026-02-30',data:{value:'120/80',unit:'mmHg'}}).success,false);
 assert.equal(entryContentSchema.safeParse({kind:'medication',label:'Example',clinicalStatus:'active',data:{unsupported:'instruction'}}).success,false);
 assert.equal(recordChangeSchema.safeParse({operation:'update',id:'entry',expectedVersion:0,entry:allergy}).success,false);
});
test('computer documents contain bounded extracted text and metadata, never host file access',()=>{
 const doc=documentInputSchema.parse({name:'report.pdf',mimeType:'application/pdf',text:'Sample extracted text',origin:{type:'computer',locator:'/workspace/report.pdf'}});
 assert.equal(doc.origin.type,'computer');
 assert.equal(documentInputSchema.safeParse({...doc,text:'x'.repeat(2*1024*1024+1)}).success,false);
});
