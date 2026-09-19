const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');const vm=require('node:vm');
function load(file,mocks={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,require:n=>{if(n in mocks)return mocks[n];throw Error(n);},Request,Response,URL,console});return module.exports;}
const ib=load('lib/inbody-report.ts');const valid=()=>({version:1,confirmed:true,measuredAt:'2026-09-19T01:00:00Z',sex:'unknown',values:{weight:{value:73.2,low:60,high:80}},segments:{muscle:{},fat:{}},cid:'',bodyType:''});
test('report preserves missing values, paper ranges and strips unrecognized fields',()=>{const r=ib.parseReport({...valid(),customerId:'other',values:{weight:{value:73.2},madeup:{value:99}}});assert.ok(r);assert.equal(r.values.muscle,undefined);assert.equal(r.values.madeup,undefined);assert.equal(r.customerId,undefined);assert.equal(ib.rangeLabel(r.values.weight),'기준 미입력');});
test('report rejects impossible values, inverted ranges, malformed dates and unconfirmed OCR',()=>{for(const patch of [{confirmed:false},{measuredAt:'no date'},{values:{fatPercent:{value:101}}},{values:{weight:{value:NaN}}},{values:{weight:{value:50,low:80,high:60}}},{values:{}}])assert.equal(ib.parseReport({...valid(),...patch}),null);});
test('report rejects remote URLs, SVG and oversized photo payload',()=>{for(const image of ['https://example.com/image.jpg','data:image/svg+xml,<svg/>','data:image/jpeg;base64,/9j/'+ 'a'.repeat(1100000)])assert.equal(ib.parseReport({...valid(),image}),null);});
test('OCR selects unambiguous labelled current numbers, excludes multiple ticks and unknown values',()=>{const r=ib.readReportText('체중 (kg) 73.2 (60~80)\n골격근량 35.1\n체지방률 10 20 30\nSMI (kg/m2) 9.5\n인바디점수 77');assert.equal(r.weight.value,73.2);assert.equal(r.weight.low,60);assert.equal(r.muscle.value,35.1);assert.equal(r.fatPercent,undefined);assert.equal(r.smi.value,9.5);assert.equal(r.bodyAge,undefined);assert.equal(r.score.value,77);});
test('segment OCR requires muscle/fat section and explicit kg/% units',()=>{const r=ib.readSegments('왼팔 4.2kg 120%\n부위별근육량\n왼팔 4.24kg 121.8%\n오른팔 4.25kg 122.1%\n부위별체지방\n왼팔 1.6kg 276.8%\n왼다리 3.4 198.9');assert.equal(r.muscle.leftArm.kg,4.24);assert.equal(r.fat.leftArm.kg,1.6);assert.equal(r.fat.leftLeg,undefined);});
function route(customer,record=null){const calls=[];const prisma={customerRecord:{findFirst:async q=>{calls.push(q);return record;},findMany:async q=>{calls.push(q);return [];},upsert:async q=>{calls.push(q);return {id:'new',kind:'inbody'};},update:async q=>{calls.push(q);return {};}}};return {calls,r:load('app/api/customer/inbody/route.ts',{'next/server':{NextResponse:{json:(b,i)=>Response.json(b,i)}},'@/lib/db':{prisma},'@/lib/customer':{customerSession:async()=>customer,sameOrigin:r=>r.headers.get('origin')==='https://site.test'},'@/lib/inbody-report':ib})};}
const request=(body,method='POST',origin='https://site.test')=>new Request('https://site.test/api/customer/inbody',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('anonymous inbody reads and writes are denied before database use',async()=>{const x=route(null);assert.equal((await x.r.GET(new Request('https://site.test/api/customer/inbody'))).status,401);assert.equal((await x.r.POST(request({}))).status,401);assert.equal(x.calls.length,0);});
test('saved inbody owner is from session and arbitrary metadata cannot be stored',async()=>{const x=route({id:'owner'});assert.equal((await x.r.POST(request({clientId:'test-record-12345',customerId:'victim',data:{...valid(),archived:true,unknown:'secret'}}))).status,200);assert.equal(x.calls[0].create.customerId,'owner');assert.equal(x.calls[0].create.data.unknown,undefined);assert.equal(x.calls[0].create.data.archived,undefined);assert.deepEqual(Object.keys(x.calls[0].update),[]);});
test('photo reads and archive operations scope to authenticated owner',async()=>{const x=route({id:'owner'});assert.equal((await x.r.GET(new Request('https://site.test/api/customer/inbody?id=other'))).status,404);assert.equal(x.calls[0].where.customerId,'owner');assert.equal((await x.r.PATCH(request({id:'other',archived:true},'PATCH'))).status,404);assert.equal(x.calls[1].where.customerId,'owner');assert.equal(x.calls.length,2);});
test('cross origin, invalid fields and large records cannot save',async()=>{const x=route({id:'owner'});assert.equal((await x.r.POST(request({},'POST','https://evil.test'))).status,403);assert.equal((await x.r.POST(request({clientId:'test-record-12345',data:{...valid(),values:{bmi:{value:-5}}}}))).status,400);assert.equal((await x.r.POST(request({junk:'a'.repeat(1200001)}))).status,413);assert.equal(x.calls.length,0);});
test('inbody customer route bypasses staff login while staff admin routes remain protected',async()=>{
 const proxy=load('proxy.ts',{'next/server':{NextResponse:{next:()=>({status:200}),json:(b,i)=>Response.json(b,i),redirect:()=>({status:307})}},'@/lib/auth':{verifySessionToken:async()=>null,getSessionCookieName:()=> 'staff'}});
 const req=path=>({nextUrl:{pathname:path},url:'https://site.test'+path,cookies:{get:()=>undefined}});
 assert.equal((await proxy.proxy(req('/inbody'))).status,200);assert.equal((await proxy.proxy(req('/api/customer/inbody'))).status,200);assert.equal((await proxy.proxy(req('/api/admin/customer-settings'))).status,401);
});

test('OCR handles bilingual table cells, sparse lines, decimal commas and repeated identical results',()=>{
 const r=ib.readReportText('체 중 (Weight) (kg) 73.2 (60.0~80.0) 단백질 (kg) 12.4\n골격근량 (kg)\n35.1\n체지방률 (%) 18,7\n체중 73.2');
 assert.equal(r.weight.value,73.2);assert.equal(r.weight.low,60);assert.equal(r.protein.value,12.4);assert.equal(r.muscle.value,35.1);assert.equal(r.fatPercent.value,18.7);
});
test('OCR does not map targets, graph ticks, negative values or conflicting repeats to current readings',()=>{
 const r=ib.readReportText('목표체중 65.0\n체지방량 조절 -2.0\n체중 70.0\n체중 71.0\n골격근량 70 80 90 100\n단백질 -1.0');
 assert.equal(Object.keys(r).length,0);
});
test('sparse labels do not steal following labelled cells and merge rejects conflicting OCR passes',()=>{
 const r=ib.readReportText('체중 (kg)\n골격근량 35.1');assert.equal(r.weight,undefined);assert.equal(r.muscle.value,35.1);
 const merged=ib.mergeReportReadings([{weight:{value:70},muscle:{value:35}},{weight:{value:78},fat:{value:15}}]);
 assert.equal(merged.weight,undefined);assert.equal(merged.muscle.value,35);assert.equal(merged.fat.value,15);
});

test('photo-only records are accepted, but empty records and untrusted photo references are rejected',()=>{
 const photo={...valid(),values:{},image:'data:image/jpeg;base64,/9j/AAAA'};
 assert.ok(ib.parseReport(photo));assert.equal(ib.parseReport({...photo,image:undefined}),null);
 assert.ok(ib.parseReport({...photo,image:undefined},true));
 assert.equal(ib.parseReport({...photo,image:'https://invalid.example/photo.jpg'}),null);
});
test('authenticated customer can save a photo-only record without invented metrics',async()=>{
 const x=route({id:'owner'});const data={...valid(),values:{},image:'data:image/jpeg;base64,/9j/AAAA'};
 assert.equal((await x.r.POST(request({clientId:'photo-only-record-123',data}))).status,200);
 assert.equal(Object.keys(x.calls[0].create.data.values).length,0);
 assert.equal(x.calls[0].create.data.image,data.image);
});

test('four-field OCR pairs labels and values across separate OCR columns without guessing missing metrics',()=>{
 const ocr=load('lib/inbody-ocr.ts',{'./inbody-report':ib});
 const header='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext';
 const word=(text,x,y,confidence=95)=>`5\t1\t1\t1\t1\t1\t${x}\t${y}\t80\t20\t${confidence}\t${text}`;
 const tsv=[header,word('체중',20,100),word('73.2',300,101),word('골격근량',20,150),word('35.1',300,151),word('체지방량',20,200),word('15.5',300,200),word('체지방률',20,250),word('21.2',300,250)].join('\n');
 const r=ocr.readInbodyBasics('체중\n골격근량\n체지방량\n체지방률\n73.2\n35.1\n15.5\n21.2',tsv);
 assert.equal(r.weight.value,73.2);assert.equal(r.muscle.value,35.1);assert.equal(r.fat.value,15.5);
 // Conflicting text/visual evidence is not guessed.
 const clean=ocr.readInbodyBasics('',tsv);assert.equal(clean.fatPercent.value,21.2);
 assert.equal(ocr.readInbodyBasics('인바디점수 80').score,undefined);
 assert.equal(ocr.visualRows([header,word('99.9',10,10,5)].join('\n')),'');
});
