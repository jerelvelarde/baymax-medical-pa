import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SensitiveDataFilter } from '@mastra/observability';
import { medicalTraceFilter } from '../src/mastra/medical-record/tracing';
test('medical statements, source text, entries and profile details stay out of serialized traces',()=>{
 const span={traceId:'synthetic-test',attributes:{},metadata:{},input:{userStatement:'synthetic-statement',token:'test-secret',changes:[{entry:{label:'synthetic-entry'}}]},output:{entries:[{label:'synthetic-entry'}],documents:[{name:'synthetic-document'}],proposal:{changes:[{quote:'synthetic-quote'}]},text:'synthetic-text',conditions:['synthetic-condition'],medications:['synthetic-medication'],allergies:['synthetic-allergy'],notes:'synthetic-note',name:'synthetic-name',revision:3},requestContext:{medicalUpdateMessageId:'synthetic-message',conversationId:'chat'}};
 const standard=new SensitiveDataFilter();standard.process(span as Parameters<typeof standard.process>[0]);const medical=medicalTraceFilter();medical.process(span as Parameters<typeof medical.process>[0]);assert.doesNotMatch(JSON.stringify(span),/synthetic-(statement|entry|document|quote|text|condition|medication|allergy|note|name|message)|test-secret/);assert.match(JSON.stringify(span),/"revision":3/);
});
