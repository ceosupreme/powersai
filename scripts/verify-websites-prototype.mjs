import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/websites'; await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const evidence={viewports:[],checks:{},pageErrors:[],blockedWrites:0};
let submitted;
async function guard(route){
 const req=route.request();
 if(req.method()!=='GET'&&req.method()!=='HEAD'){
  evidence.blockedWrites++;
  if(req.url().includes('/submit-inbound-lead')){ submitted=req.postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,id:'qa-intercepted-not-saved'})}); }
  return route.fulfill({status:200,contentType:'application/json',body:'{}'});
 }
 return route.continue();
}
async function selected(page,i){await page.waitForFunction(i=>document.getElementById(`ws-step-${i}`)?.getAttribute('aria-selected')==='true',i);}
try {
 for(const [width,height,label] of [[1440,960,'desktop'],[390,844,'phone']]){
  const context=await browser.newContext({viewport:{width,height}}); await context.route('**/*',guard);
  const page=await context.newPage();page.on('pageerror',error=>evidence.pageErrors.push(String(error)));
  await page.goto('http://127.0.0.1:8080/services/websites',{waitUntil:'networkidle'});
  await page.locator('#websites-title').waitFor();await page.evaluate(()=>document.fonts.ready);
  for(let y=0;y<await page.evaluate(()=>document.documentElement.scrollHeight);y+=700){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(100);}
  await page.waitForTimeout(800);await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(600);
  const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,height:document.documentElement.scrollHeight,h1:getComputedStyle(document.querySelector('h1')).fontFamily,brokenImages:[...document.querySelectorAll('main img')].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.alt),projects:document.querySelectorAll('.ws-project').length}));
  evidence.viewports.push({label,...metrics});assert(metrics.scrollWidth<=width+1,`${label} overflow`);assert.equal(metrics.brokenImages.length,0,`${label} broken images`);
  await page.screenshot({path:`${out}/${label}-opening.png`});await page.screenshot({path:`${out}/${label}-full.png`,fullPage:true});
  for(let i=0;i<3;i++){await page.locator(`#ws-step-${i}`).click();await selected(page,i);await page.waitForTimeout(400);await page.locator('.ws-journey').screenshot({path:`${out}/${label}-journey-${i}.png`});}
  await page.locator('#ws-step-0').click();await selected(page,0);await page.keyboard.press('ArrowDown');await selected(page,1);
  await page.locator('.ws-faq summary').first().click();assert(await page.locator('.ws-faq details').first().getAttribute('open')!==null,'FAQ opens');
  const href=await page.locator('a', {hasText:'Compare plans and what’s included'}).getAttribute('href');assert(href.includes('/pricing?')&&href.includes('src=services-websites'),'Pricing attribution');
  evidence.checks[`${label}_tabs_keyboard_faq_pricing_link`]=true;await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await context.route('**/*',guard);
 const page=await context.newPage();await page.goto('http://127.0.0.1:8080/services/websites?src=for-hvac&biz=QA%20Business',{waitUntil:'networkidle'});
 assert((await page.locator('a',{hasText:'Compare plans and what’s included'}).getAttribute('href')).includes('src=for-hvac'),'Original source retained');
 const form=page.locator('.home-contact form');await page.getByRole('link',{name:'Talk about Local Growth',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.home-contact textarea')?.value.includes('Local Growth'));
 await form.locator('textarea').fill('QA note must remain unchanged.');await page.getByRole('link',{name:'Talk through the build',exact:true}).click();assert.equal(await form.locator('textarea').inputValue(),'QA note must remain unchanged.','User note preserved');
 await form.locator('input[name="name"]').fill('QA Browser Check');await form.locator('input[name="email"]').fill('qa@example.invalid');
 await form.locator('button[type="submit"]').click();await page.getByText('Thanks—your note is in.',{exact:false}).waitFor();
 assert(submitted,'Intercepted submit');assert.equal(submitted.qualifier_data.src,'for-hvac');assert.equal(submitted.qualifier_data.source_path,'/services/websites');
 evidence.checks.intercepted_form_success_and_attribution=true;evidence.checks.typed_note_preserved=true;
 evidence.checks.reducedMotion=await page.locator('.ws-demo-stage').evaluate(e=>getComputedStyle(e).animationName==='none');assert(evidence.checks.reducedMotion,'Reduced motion');
 await context.close();
} catch(error) {evidence.failure=error.stack||String(error);process.exitCode=1;}
finally {await fs.writeFile(`${out}/evidence.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));await browser.close();}
