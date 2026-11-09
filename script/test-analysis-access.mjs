// node script/test-analysis-access.mjs — actual menu/route components, no API.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router';
const require=createRequire(import.meta.url);
let roleId=null, mobile=false;
const roles={ROLES:{SUPER_ADMIN:1,ADMIN:2,CLIENTE:3},useRole:()=>({roleId,isAdmin:roleId===2,isSuperAdmin:roleId===1})};
function load(file,mocks={},fallback){
 const source=readFileSync(file,'utf8').replaceAll('import.meta.env','({})');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};runInNewContext(js,{exports,require:name=>name in mocks?mocks[name]:fallback?fallback(name):require(name),setTimeout,clearTimeout});return exports;
}
const config=load('src/config/ConfigServer.tsx',{'@/context/role':roles,react:React},name=>{
 if(name.endsWith('.png'))return 'logo.png';
 return new Proxy({},{get:()=>()=>null});
}).configServer();
const analysis=config.useConfigApp.NAVIGATION_APP.find(item=>item.name==='Análisis');
assert.equal(analysis.link,'/analisis');
assert.deepEqual(Array.from(analysis.allowedRoles),[1,2]);
assert.ok(!config.useConfigApp.NAVIGATION_APP.some(item=>item.link==='/analisi'));
const Sidebar=load('src/layouts/sidebar/Sidebar.tsx',{
 '@/context/role':roles,
 '../../../libs/zustand/hooks/useUI':{useSidebar:()=>({isCollapsed:false,setCollapsed(){}})},
 '@/context/ThemeContext':{useTheme:()=>({theme:'dark'})},
 '@/hooks/useBreakpoints':{useBreakpoint:()=>({isMobile:mobile})},
}).default;
const Route=load('src/features/analysis/ActivityAnalysisRoute.tsx',{
 '@/context/role':roles,'react-router':{Link:'link',Navigate:'navigate'},
 './components/AnalysisLoadingOverlay':{AnalysisLoadingOverlay:()=>null},
}).default;
for(const role of [null,1,2,3]){
 roleId=role;
 const allowed=role===1||role===2;
 for(const isMobile of [false,true]){
  mobile=isMobile;
  const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Sidebar,{
   useCompany:config.useCompany,useConfigApp:config.useConfigApp,isOpenSidebar:true,setIsOpenSidebar(){},
  })));
  assert.equal(html.includes('href="/analisis"'),allowed,`Menu role=${role} mobile=${isMobile}`);
  assert.ok(html.includes('href="/historial"'));
 }
 const element=Route();
 if(allowed) assert.notEqual(element.type,'navigate');
 else {assert.equal(element.type,'navigate');assert.equal(element.props.to,'/');}
}
assert.ok(readFileSync('src/main.tsx','utf8').includes('path="/analisi" element={<Navigate to="/analisis" replace />}'));
console.log('PASS: /analisis menu and direct route allow only admin/superadmin; desktop/mobile clients denied; old URL redirects');
