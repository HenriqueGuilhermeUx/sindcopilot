#!/usr/bin/env node
// Static pre-TestFlight checks; never touches banks, tenants, Apple signing or production.
import {readFileSync} from 'node:fs';
const cap=readFileSync('capacitor.config.ts','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const errors=[];const check=(ok,msg)=>{if(!ok)errors.push(msg)};
check(/appId:\s*["']com\.sindcopilot\.app["']/.test(cap),'Incorrect SindCopilot bundle ID');
check(/webDir:\s*["']dist\/client["']/.test(cap),'Unexpected native webDir');
check(/cleartext:\s*false/.test(cap),'Cleartext transport setting changed');
check(/allowMixedContent:\s*false/.test(cap),'Mixed-content transport setting changed');
for(const dep of ['@capacitor/core','@capacitor/cli','@capacitor/android']){
 const version=pkg.dependencies?.[dep]??pkg.devDependencies?.[dep]??'';
 check(/^[~^]?8\./.test(version),'Unexpected Capacitor major: '+dep);
}
for(const dep of ['@capacitor/camera','@capacitor/filesystem','@capacitor/share']){
 check(Boolean(pkg.dependencies?.[dep]),'Missing native capability dependency: '+dep);
}
console.log('INFO: Financial parser mocks do not prove real RLS, tenant isolation, or Storage');
console.log('INFO: Play AAB, real QA, privacy, Apple Team, certificates and TestFlight remain unverified');
for(const e of errors)console.error('FAIL:',e);
if(errors.length)process.exitCode=1;else console.log('PASS: static SindCopilot config only');
