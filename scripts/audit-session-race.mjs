const { chromium } = await import(process.env.ASTRA_PLAYWRIGHT_MODULE ?? '../dist/browser-tools/node_modules/playwright-core/index.mjs');
const b=await chromium.launch({channel:'msedge'}),p=await b.newPage(),base=(process.env.ASTRA_AUDIT_URL ?? 'http://127.0.0.1:8196');
const active=async(role,name)=>{for(let n=0;n<60;n++){for(const e of await p.getByRole(role,{name,exact:true}).filter({visible:true}).all())if(!await e.evaluate(x=>!!x.closest('[inert]')))return e;await p.waitForTimeout(100)}throw Error(name)};
const click=async(role,name)=>{const e=await active(role,name);await e.evaluate(x=>x.scrollIntoView({block:'center'}));await e.click();await p.waitForTimeout(200)};
const report=async()=>{await click('link','Reports & Sync');await click('button','Preview latest report');await click('button','Confirm and queue');await click('button','View in Delivery')};
let release,started;const gate=new Promise(r=>release=r),requestStarted=new Promise(r=>started=r);
try{await p.goto(base+'/check-in');await click('button','Load demo readings');await click('button','Save demo check-in');await report();await p.getByRole('switch',{name:'Simulate communications outage'}).click();
await p.route('**/api/v1/reports',async route=>{const response=await route.fetch();started();await gate;await route.fulfill({response})});
await click('button','Send report');await requestStarted;
await click('link','Identify crew member');await click('button','Scan Crew QR');await click('button','Use Demo Crew QR');await p.waitForURL(base+'/');await p.getByText('FICTIONAL CREW — SYNTHETIC DEMO DATA',{exact:true}).filter({visible:true}).first().waitFor();
await report();release();await p.waitForTimeout(1200);
const text=await p.locator('body').innerText();if(!text.includes('ASTRA-0001')||!await (await active('button','Send report')).isVisible())throw Error('Old receipt replaced demo report');
const stored=await p.evaluate(()=>new Promise(res=>{const r=indexedDB.open('astra-care-offline',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('session').objectStore('session').get('data');q.onsuccess=()=>{res(q.result);db.close()}}}));if(stored.reports[0].status!=='acknowledged')throw Error('Original repository did not retain legitimate receipt');
console.log('PASS delayed local receipt stays in original repository; same-ID demo report remains queued');
}finally{release();await b.close()}
