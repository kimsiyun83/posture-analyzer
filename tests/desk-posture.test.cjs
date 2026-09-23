const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const ts=require('typescript');const vm=require('vm');const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/desk-posture.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:m,exports:m.exports,Date,Math});const {stepDesk,freshDesk,neckReading,validDeskReport}=m.exports;
test('sustained drift alerts only after hold, cooldown prevents chatter, recovery clears streak',()=>{let s=freshDesk(0),alerts=0;for(let t=200;t<=40000;t+=200){const r=stepDesk(s,t,15,12,8000);s=r.stats;alerts+=r.alert;if(t<8000)assert.equal(r.alert,false);}assert.equal(alerts,2);assert.equal(s.validMs,40000);assert.equal(s.badMs,40000);s=stepDesk(s,40200,7,12,8000).stats;assert.equal(s.streakMs,0);assert.equal(s.previousBad,false);});
test('tracking gaps and hidden time are excluded and cannot trigger an immediate alert',()=>{let s=freshDesk(0);for(let t=200;t<=6000;t+=200)s=stepDesk(s,t,15,12,8000).stats;const r=stepDesk(s,66000,15,12,8000);assert.equal(r.alert,false);assert.equal(r.stats.validMs,6000);assert.equal(r.stats.totalMs,66000);assert.equal(r.stats.streakMs,0);const next=stepDesk(r.stats,66200,null,12,8000);assert.equal(next.stats.validMs,6000);});
test('short nods reset and hysteresis prevents threshold flicker',()=>{let s=freshDesk(0);s=stepDesk(s,200,13,12,8000).stats;s=stepDesk(s,400,10,12,8000).stats;assert.equal(s.previousBad,true);s=stepDesk(s,600,8,12,8000).stats;assert.equal(s.previousBad,false);assert.equal(s.alerts,0);});
test('neck geometry uses pixel aspect, requires a side view and reliable points',()=>{const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:0}));p[7]={x:.5,y:.3,visibility:1};p[11]={x:.45,y:.6,visibility:1};p[0]={x:.6,y:.28,visibility:1};const r=neckReading(p,1000,500,'left');assert.ok(Math.abs(r.angle-18.4349)<.001);p[12]={x:.8,y:.6,visibility:1};assert.equal(neckReading(p,1000,500,'left'),null);assert.equal(neckReading([],1000,500,'left'),null);});
test('report rejects impossible durations and accepts a valid summary',()=>{const r={source:'camera',startedAt:'2026-09-23T01:00:00Z',endedAt:'2026-09-23T02:00:00Z',totalMs:60000,validMs:50000,badMs:10000,longestBadMs:8000,averageDelta:3,maxDelta:20,alerts:1,threshold:12,holdSeconds:8,alertMode:'voice',baseline:15};assert.equal(validDeskReport(r),true);for(const patch of [{validMs:70000},{badMs:60000},{longestBadMs:20000},{threshold:1},{averageDelta:NaN},{validMs:9000},{endedAt:'bad'}])assert.equal(validDeskReport({...r,...patch}),false);});
test('customer API stores desk summary fields only and derives owner from session',async()=>{
 const module={exports:{}};let saved;const mock={
 'next/server':{NextResponse:{json:(b,i)=>Response.json(b,i)}},
 '@/lib/db':{prisma:{customerRecord:{upsert:async q=>{saved=q;return{id:'r'};}}}},
 '@/lib/customer':{customerSession:async()=>({id:'owner'}),sameOrigin:()=>true,portalSettings:async()=>({cameraEnabled:true})},
 '@/lib/customer-record':{validCustomerRecord:(kind,data)=>kind==='desk'&&validDeskReport(data)}
 };vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/customer/records/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,require:n=>mock[n],Response,URL});
 const data={source:'camera',startedAt:'2026-09-23T01:00:00Z',endedAt:'2026-09-23T01:01:00Z',totalMs:60000,validMs:50000,badMs:10000,longestBadMs:8000,averageDelta:3,maxDelta:20,alerts:1,threshold:12,holdSeconds:8,alertMode:'beep',baseline:15,image:'must-not-save'};
 const response=await module.exports.POST(new Request('https://test/api/customer/records',{method:'POST',body:JSON.stringify({kind:'desk',clientId:'desk-record-12345',data})}));
 assert.equal(response.status,200);assert.equal(saved.create.customerId,'owner');assert.equal(saved.create.data.validMs,50000);assert.equal(saved.create.data.image,undefined);assert.equal(saved.create.data.left,undefined);
});

test('automatic side picks visible right landmarks; missing nose is explained, never fabricated',()=>{
 const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:0}));
 p[8]={x:.5,y:.3,visibility:.9};p[12]={x:.55,y:.6,visibility:.85};p[0]={x:.4,y:.28,visibility:.9};
 const result=m.exports.inspectNeck(p,1000,500,'auto');assert.equal(result.side,'right');assert.ok(result.reading);
 assert.equal(m.exports.inspectNeck(p,1000,500,'left').reading,null);
 p[0].visibility=.2;const missing=m.exports.inspectNeck(p,1000,500,'right');assert.equal(missing.reading,null);assert.match(missing.message,/코/);
 p[0].visibility=.65;assert.ok(m.exports.inspectNeck(p,1000,500,'right').reading);
});
test('calibration tolerates one short dropout and jitter, but rejects motion and resets after long gaps',()=>{
 let samples=[],r;for(let t=0;t<=5200;t+=200){if(t===2000)continue;r=m.exports.stableNeck(samples,{angle:15+(t%600===0?3:-1),size:150,direction:1,time:t});samples=r.samples;}
 assert.equal(r.ready,true);assert.ok(Math.abs(r.angle-15)<=3);
 r=m.exports.stableNeck(samples,{angle:15,size:150,direction:1,time:7000});assert.equal(r.ready,false);assert.equal(r.samples.length,1);
 samples=[];for(let t=0;t<=5200;t+=200){r=m.exports.stableNeck(samples,{angle:t/200,size:150,direction:1,time:t});samples=r.samples;}assert.equal(r.ready,false);
});
