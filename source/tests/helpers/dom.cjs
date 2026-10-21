const vm=require('node:vm');
function createHarness({data,engineSource,applicationSource,persistenceSource=''},saved=new Map()){
 const elements=new Map(),handlers={},downloads=[];
 class Element{
  constructor(id=''){this.id=id;this.dataset={};this.value='';this.checked=false;this.disabled=false;this.style={};this.textContent='';this.classList={toggle(){}};this.open=false;this._html='';}
  set innerHTML(s){this._html=s;for(const match of s.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)){const el=get(match[2]);const value=match[0].match(/\bvalue="([^"]*)"/);if(value)el.value=value[1];if(match[1]==='textarea')el.value=s.slice(match.index+match[0].length).split('</textarea>')[0];if(match[0].includes('type="checkbox"'))el.checked=/\bchecked\b/.test(match[0]);if(match[1]==='select'){const body=s.slice(match.index+match[0].length).split('</select>')[0];const options=[...body.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)];const selected=options.find(x=>/\bselected\b/.test(x[1]))||options[0];el.value=selected?(selected[1].match(/value="([^"]*)"/)?.[1]??selected[2]):'';}}}
  get innerHTML(){return this._html;}
  addEventListener(){} showModal(){this.open=true;}close(){this.open=false;}prepend(){}append(){}remove(){}click(){}getBoundingClientRect(){return {left:0,right:800,top:0,bottom:600};}
 }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
 get('courseData').textContent=data;
 const fixed=Date.parse('2026-10-11T10:00:00Z');class TestDate extends Date{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}let seed=42;const testMath=Object.create(Math);testMath.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const ctx={Date:TestDate,Math:testMath,document:{getElementById:get,addEventListener:(t,f)=>handlers[t]=f,createElement:()=>new Element(),body:new Element()},window:{scrollTo(){}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},Blob,URL:Object.assign(class URLSafe extends URL{},{createObjectURL:b=>{downloads.push(b);return 'blob:test';},revokeObjectURL(){}}),setTimeout:()=>1,clearTimeout(){},console};
 vm.createContext(ctx);vm.runInContext(engineSource,ctx);if(persistenceSource)vm.runInContext(persistenceSource,ctx);vm.runInContext(applicationSource,ctx);
 return {get,ctx,saved,downloads,read:expr=>vm.runInContext(expr,ctx),click:async(id='',dataset={})=>{const el=get(id);el.dataset=dataset;await handlers.click({target:{closest:()=>el}});},change:async(id,value,checked=false)=>{const el=get(id);el.value=value;el.checked=checked;await handlers.change({target:el});},input:async(id,value)=>{const el=get(id);el.value=value;handlers.input({target:el});}};
}
module.exports={createHarness};
