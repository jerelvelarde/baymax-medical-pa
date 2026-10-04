-- One locked row per user serializes revision, review and audit changes together.
-- The durable initialization marker prevents legacy facts resurrecting after retraction.
CREATE TABLE IF NOT EXISTS medical_record_state (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 state jsonb
);
CREATE TABLE IF NOT EXISTS medical_record_entries (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 id text NOT NULL,
 value jsonb NOT NULL,
 PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS medical_record_documents (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 id text NOT NULL,
 value jsonb NOT NULL,
 PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS medical_record_proposals (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 id text NOT NULL,
 value jsonb NOT NULL,
 PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS medical_record_events (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 id text NOT NULL,
 value jsonb NOT NULL,
 PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS medical_record_operations (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 id text NOT NULL,
 value jsonb NOT NULL,
 PRIMARY KEY(user_id,id)
);
CREATE OR REPLACE FUNCTION medical_record_command(owner uuid, action text, payload jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
 s jsonb; u users%ROWTYPE; fact record; e jsonb; old jsonb; updated jsonb;
 changes jsonb; item jsonb; provenance jsonb; result_entries jsonb := '[]';
 op text; cached jsonb; doc jsonb; proposal jsonb; idx integer; entry_idx integer; n integer := 0;
 stamp text := to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
 response jsonb; initialized boolean := false;
BEGIN
 SELECT * INTO u FROM users WHERE id=owner;
 IF NOT FOUND THEN RAISE EXCEPTION 'Medical record user not found'; END IF;
 INSERT INTO medical_record_state(user_id) VALUES(owner) ON CONFLICT DO NOTHING;
 SELECT state INTO s FROM medical_record_state WHERE user_id=owner FOR UPDATE;
 IF s IS NULL THEN
  initialized:=true;
  s := jsonb_build_object('revision',0,'entries','[]'::jsonb,'history','[]'::jsonb,'documents','[]'::jsonb,'proposals','[]'::jsonb,'operations','{}'::jsonb,'demo',u.is_demo);
  FOR fact IN
   SELECT 'demographics' kind, 'profile' key, jsonb_strip_nulls(jsonb_build_object('kind','demographics','label',u.name,'clinicalStatus','active','notes',u.notes,'data',jsonb_build_object('name',u.name,'dateOfBirth',u.date_of_birth,'sex',u.sex))) content
   UNION ALL SELECT 'condition',name,jsonb_strip_nulls(jsonb_build_object('kind','condition','label',name,'clinicalStatus',CASE WHEN status IN ('active','historical','resolved','unknown') THEN status ELSE 'unknown' END,'notes',notes,'data','{}'::jsonb)) FROM user_conditions WHERE user_id=owner
   UNION ALL SELECT 'medication',name,jsonb_build_object('kind','medication','label',name,'clinicalStatus','active','data','{}'::jsonb) FROM user_medications WHERE user_id=owner
   UNION ALL SELECT 'allergy',name,jsonb_build_object('kind','allergy','label',name,'clinicalStatus','active','data',jsonb_build_object('substance',name)) FROM user_allergies WHERE user_id=owner
   UNION ALL SELECT 'observation',concat('body:',measured_on,':',type),jsonb_build_object('kind','observation','label',type,'clinicalStatus','historical','effectiveDate',measured_on,'data',jsonb_build_object('value',value,'unit',unit)) FROM body_measurements WHERE user_id=owner
   UNION ALL SELECT 'observation',concat('lab:',l.record_id,':',l.biomarker,':',l.measured_on),jsonb_strip_nulls(jsonb_build_object('kind','observation','label',l.biomarker,'clinicalStatus','historical','effectiveDate',l.measured_on,'notes',l.notes,'data',jsonb_build_object('value',l.value,'unit',NULLIF(l.unit,''),'referenceLow',l.reference_low,'referenceHigh',l.reference_high,'flag',l.flag,'panel',l.panel))) FROM lab_results l JOIN records r ON r.user_id=l.user_id AND r.id=l.record_id WHERE l.user_id=owner AND r.source='library'
   ORDER BY kind,key
  LOOP
   e := jsonb_build_object('id','legacy-'||md5(fact.kind||':'||fact.key),'version',1,'status','current','content',fact.content,'provenance',jsonb_build_object('type',CASE WHEN u.is_demo THEN 'legacy_demo' ELSE 'legacy_import' END),'createdAt',stamp,'updatedAt',stamp);
   s := jsonb_set(s,'{entries}',s->'entries'||jsonb_build_array(e));
  END LOOP;
 ELSE
  s:=s||jsonb_build_object(
   'entries',COALESCE((SELECT jsonb_agg(value ORDER BY id) FROM medical_record_entries WHERE user_id=owner),'[]'::jsonb),
   'documents',COALESCE((SELECT jsonb_agg(CASE WHEN action IN ('propose','read-document') THEN value ELSE value-'text' END ORDER BY id) FROM medical_record_documents WHERE user_id=owner AND (action NOT IN ('propose','read-document') OR id=COALESCE(payload->>'documentId',payload->>'id'))),'[]'::jsonb),
   'proposals',COALESCE((SELECT jsonb_agg(value ORDER BY id) FROM medical_record_proposals WHERE user_id=owner),'[]'::jsonb),
   'history',CASE WHEN action='get' THEN COALESCE((SELECT jsonb_agg(value ORDER BY value->>'createdAt',id) FROM medical_record_events WHERE user_id=owner),'[]'::jsonb) ELSE '[]'::jsonb END,
   'operations',COALESCE((SELECT jsonb_object_agg(id,value) FROM medical_record_operations WHERE user_id=owner AND id=CASE WHEN action='apply' THEN payload->>'operationId' WHEN action='review' THEN 'proposal:'||(payload->>'id') END),'{}'::jsonb)
  );
 END IF;
 IF action='get' THEN response:=s;
 ELSIF action='ingest' THEN
  SELECT value INTO response FROM medical_record_documents WHERE user_id=owner AND id=payload->>'id';
  IF response IS NOT NULL THEN RETURN response; END IF;
  doc:=payload;
  IF doc->'origin'->>'type'='library' OR (doc->'origin'->>'type'='upload' AND doc->'origin'->>'recordId' IS NOT NULL) THEN
   SELECT r.* INTO fact FROM records r WHERE r.user_id=owner AND r.id=COALESCE(doc->'origin'->>'recordId',doc->'origin'->>'locator') AND r.source=doc->'origin'->>'type';
   IF NOT FOUND THEN RAISE EXCEPTION 'Source document not found'; END IF;
   IF fact.content<>doc->>'text' OR fact.name<>doc->>'name' THEN RAISE EXCEPTION 'Document source payload mismatch'; END IF;
   IF doc->'origin'->>'type'='upload' THEN
    IF doc->'origin'->>'conversationId' IS NULL OR fact.conversation_id IS DISTINCT FROM doc->'origin'->>'conversationId' OR NOT EXISTS(SELECT 1 FROM conversations WHERE user_id=owner AND id::text=doc->'origin'->>'conversationId') THEN RAISE EXCEPTION 'Invalid document source conversation'; END IF;
   END IF;
  END IF;
  s:=jsonb_set(s,'{documents}',s->'documents'||jsonb_build_array(doc)); response:=doc;
 ELSIF action='read-document' THEN
  SELECT x INTO response FROM jsonb_array_elements(s->'documents') x WHERE x->>'id'=payload->>'id';
  IF response IS NULL THEN RAISE EXCEPTION 'Document not found'; END IF;
 ELSIF action='propose' THEN
  SELECT value INTO response FROM medical_record_proposals WHERE user_id=owner AND id=payload->>'id';
  IF response IS NOT NULL THEN RETURN response; END IF;
  SELECT x INTO doc FROM jsonb_array_elements(s->'documents') x WHERE x->>'id'=payload->>'documentId';
  IF doc IS NULL THEN RAISE EXCEPTION 'Document not found'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(payload->'changes') LOOP
   IF length(item->>'quote')=0 OR strpos(doc->>'text',item->>'quote')=0 THEN RAISE EXCEPTION 'Quote must exactly match document text'; END IF;
   IF item->'change'->>'operation'<>'add' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'entries') x WHERE x->>'id'=item->'change'->>'id' AND x->>'status'='current') THEN RAISE EXCEPTION 'Entry conflict'; END IF;
  END LOOP;
  proposal:=payload||jsonb_build_object('status','pending','createdAt',stamp);
  s:=jsonb_set(s,'{proposals}',s->'proposals'||jsonb_build_array(proposal)); response:=proposal;
 ELSIF action IN ('apply','review') THEN
  IF action='review' THEN
   SELECT x, ordinality::integer-1 INTO proposal,idx FROM jsonb_array_elements(s->'proposals') WITH ORDINALITY t(x,ordinality) WHERE x->>'id'=payload->>'id';
   IF proposal IS NULL THEN RAISE EXCEPTION 'Proposal not found'; END IF;
   IF proposal->>'status'='rejected' AND payload->>'decision'='accept' OR proposal->>'status'='accepted' AND payload->>'decision'='reject' THEN RAISE EXCEPTION 'Proposal review conflict'; END IF;
   IF payload->>'decision'='reject' THEN
    proposal:=proposal||jsonb_build_object('status','rejected','reviewedAt',COALESCE(proposal->>'reviewedAt',stamp));
    s:=jsonb_set(s,ARRAY['proposals',idx::text],proposal); response:='null'::jsonb;
   ELSE
    op:='proposal:'||(proposal->>'id'); changes:=proposal->'changes';
   END IF;
  ELSE op:=payload->>'operationId'; changes:=payload->'changes'; END IF;
  IF op IS NOT NULL THEN
   cached:=s->'operations'->op;
   IF cached IS NOT NULL THEN
    IF cached->'payload'<>payload THEN RAISE EXCEPTION 'Operation id conflict'; END IF;
    response:=cached->'receipt';
   ELSE
    FOR item IN SELECT value FROM jsonb_array_elements(changes) LOOP
     n:=n+1;
     IF action='review' THEN provenance:=jsonb_build_object('type','document','documentId',proposal->>'documentId','quote',item->>'quote'); item:=item->'change';
     ELSE provenance:=jsonb_strip_nulls(jsonb_build_object('type','user_chat','userStatement',payload->>'userStatement','conversationId',payload->>'conversationId')); END IF;
     old:=NULL;
     IF item->>'operation'='add' THEN
      e:=jsonb_build_object('id','entry-'||md5(op||':'||n::text),'version',1,'status','current','content',item->'entry','provenance',provenance,'createdAt',stamp,'updatedAt',stamp);
      s:=jsonb_set(s,'{entries}',s->'entries'||jsonb_build_array(e));
     ELSE
      SELECT x,ordinality::integer-1 INTO old,entry_idx FROM jsonb_array_elements(s->'entries') WITH ORDINALITY t(x,ordinality) WHERE x->>'id'=item->>'id';
      IF old IS NULL OR old->>'status'<>'current' OR (old->>'version')::integer<>(item->>'expectedVersion')::integer THEN RAISE EXCEPTION 'Entry version conflict'; END IF;
      e:=old||jsonb_build_object('version',(old->>'version')::integer+1,'updatedAt',stamp,'provenance',provenance);
      IF item->>'operation'='update' THEN e:=e||jsonb_build_object('content',item->'entry');
      ELSE e:=e||jsonb_build_object('status','retracted'); END IF;
      s:=jsonb_set(s,ARRAY['entries',entry_idx::text],e);
     END IF;
     result_entries:=result_entries||jsonb_build_array(e);
     s:=jsonb_set(s,'{history}',s->'history'||jsonb_build_array(jsonb_build_object('id','event-'||md5(op||':'||jsonb_array_length(result_entries)::text),'operationId',op,'entryId',e->>'id','operation',item->>'operation','before',old,'after',e,'createdAt',stamp,'reason',item->>'reason')));
    END LOOP;
    s:=jsonb_set(s,'{revision}',to_jsonb((s->>'revision')::integer+1));
    response:=jsonb_build_object('operationId',op,'revision',s->'revision','entries',result_entries);
    s:=jsonb_set(s,ARRAY['operations',op],jsonb_build_object('payload',payload,'receipt',response));
    IF action='review' THEN s:=jsonb_set(s,ARRAY['proposals',idx::text],proposal||jsonb_build_object('status','accepted','reviewedAt',stamp)); END IF;
   END IF;
  END IF;
 ELSE RAISE EXCEPTION 'Unsupported medical record command'; END IF;
 IF action IN ('get','read-document') AND NOT initialized THEN RETURN response; END IF;
 -- Persist changed mutable rows; source documents, operations and audit events are insert-only.
 INSERT INTO medical_record_entries(user_id,id,value) SELECT owner,x->>'id',x FROM jsonb_array_elements(s->'entries') x
 ON CONFLICT(user_id,id) DO UPDATE SET value=excluded.value WHERE medical_record_entries.value<>excluded.value;
 INSERT INTO medical_record_proposals(user_id,id,value) SELECT owner,x->>'id',x FROM jsonb_array_elements(s->'proposals') x
 ON CONFLICT(user_id,id) DO UPDATE SET value=excluded.value WHERE medical_record_proposals.value<>excluded.value;
 INSERT INTO medical_record_documents(user_id,id,value) SELECT owner,x->>'id',x FROM jsonb_array_elements(s->'documents') x ON CONFLICT DO NOTHING;
 INSERT INTO medical_record_events(user_id,id,value) SELECT owner,x->>'id',x FROM jsonb_array_elements(s->'history') x ON CONFLICT DO NOTHING;
 INSERT INTO medical_record_operations(user_id,id,value) SELECT owner,key,value FROM jsonb_each(s->'operations') ON CONFLICT DO NOTHING;
 UPDATE medical_record_state SET state=jsonb_build_object('revision',s->'revision','demo',s->'demo') WHERE user_id=owner;
 RETURN response;
END $$;

-- Immutable evidence/audit rows can be deleted by explicit user/demo reset, but never edited.
CREATE OR REPLACE FUNCTION medical_record_immutable_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable medical record source or audit row'; END $$;
DROP TRIGGER IF EXISTS medical_record_documents_immutable ON medical_record_documents;
CREATE TRIGGER medical_record_documents_immutable BEFORE UPDATE ON medical_record_documents FOR EACH ROW EXECUTE FUNCTION medical_record_immutable_row();
DROP TRIGGER IF EXISTS medical_record_events_immutable ON medical_record_events;
CREATE TRIGGER medical_record_events_immutable BEFORE UPDATE ON medical_record_events FOR EACH ROW EXECUTE FUNCTION medical_record_immutable_row();
DROP TRIGGER IF EXISTS medical_record_operations_immutable ON medical_record_operations;
CREATE TRIGGER medical_record_operations_immutable BEFORE UPDATE ON medical_record_operations FOR EACH ROW EXECUTE FUNCTION medical_record_immutable_row();
