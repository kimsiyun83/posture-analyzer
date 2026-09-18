/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
function load(file,mocks={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,require:(n)=>{if(n in mocks)return mocks[n];throw Error('Unexpected import '+n);},Request,Response,URL,TextEncoder,console});return module.exports;}
const live=load('lib/pose/live.ts');
test('angles account for camera aspect ratio and reject zero-length bones',()=>{assert.equal(live.jointAngle({x:0,y:.5},{x:0,y:0},{x:.5,y:0},720,1280),90);assert.equal(live.jointAngle({x:0,y:0},{x:0,y:0},{x:1,y:1},720,1280),null);assert.ok(Math.abs(live.jointAngle({x:1,y:0},{x:0,y:0},{x:1,y:1},100,200)-63.4349)<.001);});
const feet=(raised=.8,support=.8)=>({raised,support,scale:.3});
function ready(){let s=live.freshBalance();for(let t=100;t<=1200;t+=100)s=live.stepBalance(s,t,feet());assert.equal(s.phase,'ready');return s;}
test('balance requires grounded calibration, ignores brief lift, finishes once at first confirmed landing',()=>{let s=ready();s=live.stepBalance(s,1300,feet(.72));s=live.stepBalance(s,1400,feet());assert.equal(s.phase,'ready');assert.equal(s.liftAt,0);for(let t=1500;t<=2200;t+=100)s=live.stepBalance(s,t,feet(.72));assert.equal(s.phase,'timing');for(let t=2300;t<=2500;t+=100)s=live.stepBalance(s,t,feet());assert.equal(s.phase,'done');assert.equal(s.seconds,.8);assert.equal(live.stepBalance(s,3000,feet(.72)).seconds,.8);});
test('tracking loss and moved supporting foot invalidate a timed attempt',()=>{let s=ready();for(let t=1300;t<=1800;t+=100)s=live.stepBalance(s,t,feet(.72));assert.equal(s.phase,'timing');assert.equal(live.stepBalance(s,1900,null).phase,'invalid');assert.equal(live.stepBalance(s,1900,feet(.72,.7)).phase,'invalid');assert.equal(live.stepBalance(s,2800,feet(.72)).phase,'invalid');});
test('low visibility and out-of-frame joints cannot pass quality checks',()=>{assert.equal(live.visible([{x:.5,y:.5,visibility:.4}],[0]),false);assert.equal(live.visible([{x:1.1,y:.5,visibility:1}],[0]),false);});
const validator=load('lib/customer-record.ts',{'./pose/report-details':{parseReportMetrics:()=>null}});
test('record validation rejects nonfinite, negative, unfinished, and unknown measurements',()=>{for(const d of [{left:-1,right:4,source:'camera'},{left:NaN,right:4,source:'camera'},{left:181,right:4,source:'camera'}])assert.equal(validator.validCustomerRecord('elbow',d),false);assert.equal(validator.validCustomerRecord('chair',{count:5,seconds:15,source:'manual'}),false);assert.equal(validator.validCustomerRecord('balance',{left:10,right:12,source:'camera'}),true);assert.equal(validator.validCustomerRecord('other',{}),false);});
const json=(data,init)=>Response.json(data,init);
function records(customer){let writes=[];let queries=[];return {writes,queries,route:load('app/api/customer/records/route.ts',{'next/server':{NextResponse:{json}},'@/lib/customer':{customerSession:async()=>customer,sameOrigin:r=>r.headers.get('origin')==='https://test.example',portalSettings:async()=>({cameraEnabled:true})},'@/lib/customer-record':validator,'@/lib/db':{prisma:{customerRecord:{findMany:async q=>{queries.push(q);return [];},upsert:async q=>{writes.push(q);return {id:'saved'};}}}}})};}
const request=(body,origin='https://test.example')=>new Request('https://test.example/api/customer/records',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('anonymous reads and writes denied without database access',async()=>{const x=records(null);assert.equal((await x.route.GET(new Request('https://test.example/api/customer/records'))).status,401);assert.equal((await x.route.POST(request({}))).status,401);assert.equal(x.writes.length+x.queries.length,0);});
test('customer identity comes from session, not submitted customer ID; extra video is discarded',async()=>{const x=records({id:'owner'});await x.route.GET(new Request('https://test.example/api/customer/records?customerId=someoneElse'));assert.equal(x.queries[0].where.customerId,'owner');const result=await x.route.POST(request({customerId:'victim',clientId:'attempt-12345',kind:'balance',data:{left:4,right:5,source:'camera',video:'secret'}}));assert.equal(result.status,200);assert.equal(x.writes[0].create.customerId,'owner');assert.equal(x.writes[0].create.data.video,undefined);assert.equal(x.writes[0].where.customerId_clientId.customerId,'owner');});
test('cross-origin writes and malformed/null results rejected',async()=>{const x=records({id:'owner'});assert.equal((await x.route.POST(request({},'https://attacker.example'))).status,403);assert.equal((await x.route.POST(request(null))).status,400);assert.equal(x.writes.length,0);});
test('non-admin cannot modify portal settings',async()=>{let wrote=false;const r=load('app/api/admin/customer-settings/route.ts',{'next/server':{NextResponse:{json}},'@/lib/customer':{portalAdmin:async()=>null,sameOrigin:()=>true},'@/lib/db':{prisma:{portalSettings:{upsert:async()=>{wrote=true;}}}}});assert.equal((await r.POST(request({signupEnabled:true,cameraEnabled:true}))).status,403);assert.equal(wrote,false);});
function authMock(existing=null){const events=[];return {events,route:load('app/api/customer/auth/route.ts',{'next/server':{NextResponse:{json}},'next/headers':{cookies:async()=>({delete:()=>{}})},'@/lib/db':{prisma:{customer:{findUnique:async()=>existing,create:async q=>{events.push(q);return {id:'newCustomer'};}}}},'@/lib/auth':{hashPassword:async()=>'hashed',verifyPassword:async(p,h)=>h==='valid'&&p==='password123'},'@/lib/customer':{customerSession:async()=>null,setCustomerSession:async id=>events.push(id),sameOrigin:r=>r.headers.get('origin')==='https://test.example',portalSettings:async()=>({signupEnabled:true})},'@/lib/customer-rate-limit':{customerRateLimit:async()=>true}})};}
test('signup requires consent and cannot create a staff/admin role from submitted data',async()=>{const x=authMock();const body={mode:'signup',name:'Test',email:'test@example.com',password:'password123',role:'admin'};assert.equal((await x.route.POST(request(body))).status,400);assert.equal(x.events.length,0);assert.equal((await x.route.POST(request({...body,consent:true}))).status,200);assert.equal(x.events[0].data.role,undefined);assert.equal(x.events[0].data.passwordHash,'hashed');});
test('disabled account and wrong passwords cannot create a customer session',async()=>{for(const existing of [{id:'x',active:false,passwordHash:'valid'},{id:'x',active:true,passwordHash:'wrong'}]){const x=authMock(existing);assert.equal((await x.route.POST(request({email:'test@example.com',password:'password123'}))).status,401);assert.equal(x.events.length,0);}});
test('balance calibrates at smaller full-body framing and completes lift/landing',()=>{
 let s=live.freshBalance();
 const sample=(raised=.8)=>({support:.8,raised,scale:.08});
 for(let t=100;t<=1200;t+=100)s=live.stepBalance(s,t,sample());
 assert.equal(s.phase,'ready');
 for(let t=1300;t<=2400;t+=100)s=live.stepBalance(s,t,sample(.77));
 assert.equal(s.phase,'timing');
 for(let t=2500;t<=2800;t+=100)s=live.stepBalance(s,t,sample());
 assert.equal(s.phase,'done');
 assert.equal(s.seconds,1.2);
});
test('hidden toes do not reject visible ankles; missing ankles still reject',()=>{
 const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
 p[11].y=p[12].y=.25;p[23].y=p[24].y=.45;p[27].y=p[28].y=.8;
 p[31].visibility=p[32].visibility=0;
 assert.ok(live.balanceFeet(p,true));
 p[27].visibility=.2;assert.equal(live.balanceFeet(p,true),null);
});
test('median angle rejects one-frame spikes and small projected bones are rejected',()=>{
 assert.equal(live.medianAngle([89,150,90]),90);
 assert.equal(live.jointAngle({x:.51,y:.5},{x:.5,y:.5},{x:.5,y:.51},720,960),null);
});
test('standing ankle jitter does not start balance timing',()=>{
 let s=ready();
 for(let t=1300;t<5000;t+=100)s=live.stepBalance(s,t,feet(.8+(t%200? .004:-.004)));
 assert.equal(s.phase,'ready');assert.equal(s.seconds,0);
});
