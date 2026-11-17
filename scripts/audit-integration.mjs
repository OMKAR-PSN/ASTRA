const { chromium } = await import(process.env.ASTRA_PLAYWRIGHT_MODULE ?? '../dist/browser-tools/node_modules/playwright-core/index.mjs');
import { writeFile } from 'node:fs/promises';
const base=(process.env.ASTRA_AUDIT_URL ?? 'http://127.0.0.1:8196');
const browser=await chromium.launch({channel:'msedge'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
const checks=[],timings=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok,detail)=>{checks.push({name,ok,detail});if(!ok)throw Error(name+': '+detail)};
const btn=name=>page.getByRole('button',{name,exact:true}).filter({visible:true});
const tap=async name=>{const el=btn(name).last();await el.evaluate(e=>e.scrollIntoView({block:'center'}));await el.click();await page.waitForTimeout(200)};
const data=()=>page.evaluate(()=>new Promise((res,rej)=>{const r=indexedDB.open('astra-care-offline',1);r.onsuccess=()=>{const db=r.result;const q=db.transaction('session').objectStore('session').get('data');q.onsuccess=()=>{res(q.result);db.close()};q.onerror=()=>rej(q.error)};r.onerror=()=>rej(r.error)}));
const go=async path=>{const t=Date.now();await page.goto(base+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);timings.push({action:'cold route '+path,ms:Date.now()-t});};
const shot=async name=>page.screenshot({path:'dist/audit/'+name+'.png'});
try{
await go('/');await shot('overview-1440');
await go('/guided-check-in');await tap('Start Check-In');
await page.getByRole('radio',{name:'Good',exact:true}).click();await page.getByRole('radio',{name:'Stress 2 of 5',exact:true}).click();await tap('Continue');
await page.getByLabel('Sleep duration in hours').fill('7.5');await tap('Continue');
await page.getByLabel('Heart rate in bpm').fill('86');await tap('Continue');
await tap('Open Body Map');await tap('Select Head, front view');await page.getByRole('radio',{name:'Pain or discomfort',exact:true}).click();await page.getByRole('radio',{name:'3, Moderate',exact:true}).click();await tap('Add symptom');await shot('body-map-1440');await tap('Done');
await page.getByRole('checkbox',{name:'Headache',exact:true}).click();
await page.getByLabel('Activity note').fill('Synthetic audit fixture only');
if(await page.getByRole('radio',{name:'Earlier today',exact:true}).count()){await page.getByRole('radio',{name:'Earlier today',exact:true}).click();await btn('Continue').first().click();}
await tap('Continue');await btn('Save check-in').evaluate(e=>{e.click();e.click()});
await page.getByText('Check-in saved.',{exact:true}).waitFor();
let d=await data();check('guided double save creates exactly one observation',d.checkIns.length===1,d.checkIns.length);check('no report before confirmation',d.reports.length===0);
check('manual HR preserved',d.checkIns[0].readings.heartRateBpm===86);check('unmeasured temperature absent',d.checkIns[0].readings.temperatureC==null);
const original=JSON.stringify(d.checkIns);
for(const route of ['/assessment','/dashboard','/replay','/journey','/knowledge','/privacy','/personal','/crew-summary','/voice-settings','/delivery','/report','/check-in']){await go(route);await shot(route.slice(1)+'-1440');check('no overflow '+route,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
check('read-only views preserve observations',JSON.stringify((await data()).checkIns)===original);
await go('/report');await tap('Confirm and queue');await page.getByText(/Confirmed as/).first().waitFor();d=await data();check('one confirmed report',d.reports.length===1);check('confirmation queues without receipt',d.reports[0].status==='queued'&&!d.reports[0].receipt);
await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
await context.setOffline(true);
await go('/knowledge');check('cold cached knowledge opens offline',(await page.locator('body').innerText()).includes('Knowledge'));
await go('/check-in');await tap('Load demo readings');await btn('Save demo check-in').evaluate(e=>{e.click();e.click()});await page.waitForTimeout(500);
d=await data();check('offline detailed double save adds one',d.checkIns.length===2,d.checkIns.length);check('earlier report preserved',d.reports.length===1);
await go('/assessment');await go('/replay');await context.setOffline(false);
await go('/delivery');await page.getByRole('switch',{name:'Simulate communications outage'}).click();const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/v1/reports')&&r.request().method()==='POST');await tap('Send report');const response=await responsePromise;check('real simulated receiver accepted report',[200,201].includes(response.status()));await page.waitForTimeout(600);d=await data();check('acknowledgement stored only with receiver receipt',d.reports[0].status==='acknowledged'&&Boolean(d.reports[0].receipt?.receiverReference));
await go('/identify');await tap('Scan Crew QR');await tap('Use Demo Crew QR');await page.waitForURL(base+'/');await page.getByText('FICTIONAL CREW — SYNTHETIC DEMO DATA',{exact:true}).filter({visible:true}).first().waitFor();
check('demo fixture leaves local storage intact',(await data()).checkIns.length===2);
await shot('demo-overview-1440');
for(const [w,h] of [[390,844]]){await page.setViewportSize({width:w,height:h});for(const route of ['/','/guided-check-in','/check-in','/assessment','/dashboard','/replay','/journey','/knowledge','/voice-settings','/delivery','/report','/privacy','/personal','/crew-summary']){await go(route);await shot((route.slice(1)||'overview')+'-390');check('mobile no overflow '+route,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}}
}catch(e){errors.push(e.stack);console.error(e);console.log((await page.locator('body').innerText()).slice(-6000));await shot('failure')}finally{await writeFile('dist/audit/integration.json',JSON.stringify({checks,timings,errors},null,2));await browser.close()}
console.log(JSON.stringify({checks:checks.length,errors},null,2));process.exitCode=errors.length?1:0;
