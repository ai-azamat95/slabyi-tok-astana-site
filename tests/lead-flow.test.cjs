const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function app() {
 const nodes = new Map();
 const selection = {systemType:'ip',hdd:'1tb',wifiType:'outdoor'};
 const node = selector => {
  if (/input\[name=/.test(selector)) return {value:selection[selector.match(/name="([^"]+)"/)[1]]};
  if (!nodes.has(selector)) nodes.set(selector,{value:'',checked:false,textContent:'',innerHTML:'',dataset:{},classList:{add(){},remove(){}},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}});
  return nodes.get(selector);
 };
 const context = {Intl,console, document:{body:node('body'),querySelector:node,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},window:{location:{},barlauProducts:[{id:1,title:'Camera',price:15900}]}};
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
 for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(m[1]);
 assert.match(html,/id="leadPhone"[^>]*required/);assert.match(html,/Чтобы передать заявку, отправьте сообщение в чате/);
 assert.doesNotMatch(html,/AW-17847190636|50000|до 3 лет|за 1-2 дня/);
});
test('contact tracking records intent without sales values or old Ads destinations',()=>{
 const html=fs.readFileSync('index.html','utf8');const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('function trackPhoneClick'))[1];
 const context={window:{},document:{addEventListener(){}},Date};context.window.dataLayer=[];context.dataLayer=context.window.dataLayer;vm.createContext(context);vm.runInContext(script,context);
 vm.runInContext("trackPhoneClick('hero');trackWhatsAppClick('sticky');trackFormSubmit('lead_modal_submit')",context);
 const events=context.dataLayer.filter(x=>x[0]==='event');assert.deepEqual(Array.from(events,x=>x[1]),['phone_click','whatsapp_click','whatsapp_form_open']);
 for(const event of events){assert.equal(event[2].value,undefined);assert.equal(event[2].send_to,undefined);}
});
