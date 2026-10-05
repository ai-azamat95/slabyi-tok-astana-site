const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function app() {
 const nodes = new Map();
 const selection = {requestType:'turnkey',systemType:'ip',hdd:'1tb',wifiType:'outdoor'};
 const node = selector => {
  if (/input\[name=/.test(selector)) return {value:selection[selector.match(/name="([^"]+)"/)[1]]};
  if (!nodes.has(selector)) nodes.set(selector,{value:'',checked:false,textContent:'',innerHTML:'',dataset:{},classList:{add(){},remove(){}},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}});
  return nodes.get(selector);
 };
 const session = new Map();
 const sessionStorage = {getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,value)};
 const context = {Intl,console,URLSearchParams,sessionStorage,document:{body:node('body'),querySelector:node,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},window:{location:{search:''},sessionStorage,barlauProducts:[{id:1,title:'Camera',price:15900}]}};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('script.js','utf8').split('menuToggle.addEventListener')[0],context);
 node('#cameras').value='4';
 return {node,selection,context,run:code=>vm.runInContext(code,context)};
}
test('IP estimate preserves prices and adds optional equipment',()=>{
 const a=app();a.run('calculate()');assert.equal(a.run('lastTotal'),204000);
 a.node('#monitorOption').checked=true;a.node('#boxOption').checked=true;a.run('calculate()');assert.equal(a.run('lastTotal'),281500);
 const url=new URL(a.node('#calcRequestLink').href);assert.equal(url.hostname,'wa.me');assert.match(url.searchParams.get('text'),/Город: Астана/);
 a.node('#cameras').value='8';a.run('calculate()');assert.equal(a.run('lastTotal'),422500);
});
test('Wi-Fi options still recalculate and archive is not promised',()=>{
 const a=app();a.selection.systemType='wifi';a.run('calculate()');assert.equal(a.run('lastTotal'),78000);
 a.selection.wifiType='indoor';a.run('calculate()');assert.equal(a.run('lastTotal'),71000);
 a.selection.systemType='ip';a.run('calculate()');assert.doesNotMatch(a.node('#estimateList').innerHTML,/сут\./);
});
test('equipment-only request removes installation and keeps source attribution',()=>{
 const a=app();a.selection.requestType='equipment';a.context.window.location.search='?utm_source=google&utm_campaign=equipment_astana&utm_content=equipment&utm_term=купить+камеры';a.run('calculate()');
 assert.equal(a.run('lastTotal'),152000);assert.equal(a.node('#installationSubtotalRow').hidden,true);assert.match(a.node('#calcRequestLink').textContent,/оборудования/);
 const text=new URL(a.node('#calcRequestLink').href).searchParams.get('text');assert.match(text,/Купить оборудование/);assert.match(text,/Источник: Google Ads/);assert.match(text,/equipment_astana/);assert.doesNotMatch(text,/Монтаж ×/);
});
test('lead handoff includes object, city, phone and estimate without claiming delivery',()=>{
 const a=app();a.node('#leadName').value='Тест';a.node('#leadPhone').value='+77000000000';a.node('#leadObject').value='Аптека';a.node('#leadComment').value='Нужен монтаж';
 a.run('submitLeadForm({preventDefault(){}})');const url=new URL(a.context.window.location.href);const text=url.searchParams.get('text');
 assert.equal(url.pathname,'/77776083077');assert.match(text,/Объект: Аптека/);assert.match(text,/Город: Астана/);assert.match(text,/Нужен монтаж/);assert.match(text,/204\s000/);
});
test('catalog cart quantity and removal remain functional',()=>{
 const a=app();a.run('addToCart("1")');assert.equal(a.run('cartSummary().total'),15900);
 a.run('changeCartQty("1",1)');assert.equal(a.run('cartSummary().total'),31800);
 a.run('changeCartQty("1",-2)');assert.equal(a.run('cartSummary().count'),0);
});
test('page keeps ad anchors, honest handoff and validated structured data',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const id of ['about','catalog','services','works','prices','contacts'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
 assert.match(html,/name="requestType" value="equipment"/);assert.match(html,/name="requestType" value="turnkey" checked/);
 assert.ok(html.indexOf('id="prices"')<html.indexOf('class="section business-objects"'));
 for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(m[1]);
 assert.match(html,/id="leadPhone"[^>]*required/);assert.match(html,/Чтобы передать заявку, отправьте сообщение в чате/);
 assert.doesNotMatch(html,/AW-17847190636|50000|до 3 лет|за 1-2 дня/);
});

test('equipment landing page is indexable, tracked and included in sitemap',()=>{
 const html=fs.readFileSync('oborudovanie-videonablyudeniya-astana/index.html','utf8');
 assert.match(html,/<link rel="canonical" href="https:\/\/video-astana\.kz\/oborudovanie-videonablyudeniya-astana\/"/);
 assert.match(html,/Только оборудование или система под ключ/);assert.match(html,/videoastana_equipment_request_open/);
 assert.match(html,/<meta name="robots" content="index, follow, max-image-preview:large"/);
 for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(m[1]);
 assert.match(fs.readFileSync('sitemap.xml','utf8'),/https:\/\/video-astana\.kz\/oborudovanie-videonablyudeniya-astana\//);
});
test('VOLS service has a dedicated indexable and tracked lead path',()=>{
 const homepage=fs.readFileSync('index.html','utf8');
 const html=fs.readFileSync('montazh-vols-svarka-optiki-astana/index.html','utf8');
 const sitemap=fs.readFileSync('sitemap.xml','utf8');
 assert.match(homepage,/id="vols"/);assert.match(homepage,/Протяжка и сварка оптики/);
 assert.match(html,/<link rel="canonical" href="https:\/\/video-astana\.kz\/montazh-vols-svarka-optiki-astana\/"/);
 assert.match(html,/<h1>Монтаж ВОЛС и сварка оптики в Астане<\/h1>/);
 assert.match(html,/videoastana_vols_request_open/);assert.match(html,/utm_campaign/);
 assert.match(html,/AW-18455982142\/9QebCNLnxYkdEL7gv-BE/);
 assert.doesNotMatch(html,/\bvalue\s*:/);assert.doesNotMatch(html,/\bcurrency\s*:/);
 for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(m[1]);
 assert.match(sitemap,/https:\/\/video-astana\.kz\/montazh-vols-svarka-optiki-astana\//);
});
test('contact tracking records intent without sales values or old Ads destinations',()=>{
 const html=fs.readFileSync('index.html','utf8');const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('function trackPhoneClick'))[1];
 const context={window:{},document:{addEventListener(){}},Date};context.window.dataLayer=[];context.dataLayer=context.window.dataLayer;vm.createContext(context);vm.runInContext(script,context);
 vm.runInContext("trackPhoneClick('hero');trackWhatsAppClick('sticky');trackFormSubmit('lead_modal_submit')",context);
 const events=context.dataLayer.filter(x=>x[0]==='event');assert.deepEqual(Array.from(events,x=>x[1]),['phone_click','videoastana_phone_click','whatsapp_click','videoastana_whatsapp_click','whatsapp_form_open']);
 for(const event of events){assert.equal(event[2].value,undefined);assert.equal(event[2].send_to,undefined);}
});

test('Google Ads receives separate secondary WhatsApp intents without fabricated revenue',()=>{
 const installDestination='AW-18455982142/9QebCNLnxYkdEL7gv-BE';
 const equipmentDestination='AW-18455982142/CqNpCKahyokdEL7gv-BE';
 const homepage=fs.readFileSync('index.html','utf8');
 const script=fs.readFileSync('script.js','utf8');
 const equipment=fs.readFileSync('oborudovanie-videonablyudeniya-astana/index.html','utf8');
 assert.match(homepage,/gtag\('config', 'AW-18455982142'\)/);
 assert.match(homepage,new RegExp(installDestination.replace('/','\\/')));
 assert.match(homepage,new RegExp(equipmentDestination.replace('/','\\/')));
 assert.match(script,/trackGoogleAdsQuote\?\.\(lastRequestType\)/);
 assert.match(equipment,new RegExp(equipmentDestination.replace('/','\\/')));
 for(const file of ['videonablyudenie-dlya-magazina-astana/index.html','videonablyudenie-dlya-apteki-astana/index.html','videonablyudenie-dlya-lombarda-astana/index.html']){
  const html=fs.readFileSync(file,'utf8');
  assert.match(html,/gtag\('config','AW-18455982142'\)/);
  assert.match(html,new RegExp(installDestination.replace('/','\\/')));
 }
 const conversionPayloads=[homepage,equipment,...['videonablyudenie-dlya-magazina-astana/index.html','videonablyudenie-dlya-apteki-astana/index.html','videonablyudenie-dlya-lombarda-astana/index.html'].map(file=>fs.readFileSync(file,'utf8'))]
  .flatMap(html=>[...html.matchAll(/gtag\('event',\s*'conversion',\s*\{([\s\S]*?)\}\);?/g)].map(match=>match[1]));
 assert.ok(conversionPayloads.length>=4);
 for(const payload of conversionPayloads){assert.doesNotMatch(payload,/\bvalue\s*:/);assert.doesNotMatch(payload,/\bcurrency\s*:/);}
});

test('SEO service pages have unique canonical metadata, valid JSON-LD and sitemap coverage',()=>{
 const pages=[
  'videonablyudenie-dlya-magazina-astana',
  'videonablyudenie-dlya-apteki-astana',
  'videonablyudenie-dlya-lombarda-astana',
 ];
 const sitemap=fs.readFileSync('sitemap.xml','utf8');
 const titles=new Set();
 for(const slug of pages){
  const html=fs.readFileSync(`${slug}/index.html`,'utf8');
  const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert.ok(title);assert.equal(titles.has(title),false);titles.add(title);
  assert.match(html,new RegExp(`<link rel="canonical" href="https://video-astana\\.kz/${slug}/"`));
  assert.match(html,/<html lang="ru-KZ">/);
  assert.match(html,/\+7 777 608 3077/);
  assert.doesNotMatch(html,/до 3 лет|за 1-2 дня|гарантируем|круглосуточно/);
  for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(m[1]);
  assert.match(sitemap,new RegExp(`https://video-astana\\.kz/${slug}/`));
 }
});

test('phone pattern accepts common formats and rejects text',()=>{
 const pattern=fs.readFileSync('index.html','utf8').match(/pattern="([^"]*)"/)[1];
 const regex=new RegExp(`^(?:${pattern})$`,'v');
 for(const phone of ['+7 700 000 00 00','8 (700) 000-00-00','+77000000000'])assert.ok(regex.test(phone));
 assert.equal(regex.test('not a phone'),false);
});
