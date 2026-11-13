// node script/test-track-link-auth.mjs — no real sign-in or network calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,mocks){
 const exports={};
 const js=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 runInNewContext(js,{exports,require:name=>name in mocks?mocks[name]:require(name)});
 return exports;
}
const deepLocation={pathname:'/historial',search:'?track=T23%2B45',hash:'#tracks'};
for(const [destination,expected] of [[deepLocation,'/historial?track=T23%2B45#tracks'],[undefined,'/'],[{pathname:'//external.invalid'},'/']]){
 const calls=[];
 const router={useNavigate:()=>path=>calls.push(path),useLocation:()=>({state:{from:destination}})};
 const {useLoginForm}=load('src/template/auth/hooks/useLoginForm.ts',{
  react:{useState:initial=>[initial,()=>{}],useCallback:fn=>fn},'react-router':router,
  '@/libs/better-auth':{useBetterAuth:()=>({signIn:{email:async()=>{}}})},
 });
 await useLoginForm().handleSubmit({preventDefault(){}});
 assert.equal(calls[0],expected,'Login must preserve the complete internal history URL');
 const routes=load('libs/better-auth/components/ProtectedRoute.tsx',{
  'react-router':{...router,Navigate:'navigate'},'../hooks':{useBetterSession:()=>({isAuthenticated:true,isLoading:false})},
 });
 assert.equal(routes.PublicOnlyRoute({children:null,redirectTo:'/'}).props.to,expected,'The authenticated login route must not override the track destination');
}
console.log('PASS: PDF history destination survives login and authenticated-route redirect, including query and hash');
