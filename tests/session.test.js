import test from 'node:test';
import assert from 'node:assert/strict';
import {saveSession,readSession,clearSession,SESSION_KEY} from '../src/session.js';
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
test('login survives a new session read without persisting a password',()=>{const s=storage();saveSession(s,{role:'student',name:'Soumya Sharma'},1000);assert.deepEqual(readSession(s,2000),{role:'student',name:'Soumya Sharma'});assert.equal(s.getItem(SESSION_KEY).includes('password'),false)});
test('logout clears persisted session',()=>{const s=storage();saveSession(s,{role:'admin',name:'Daivik'});clearSession(s);assert.equal(readSession(s),null)});
test('expired, malformed and unknown sessions are rejected',()=>{const s=storage();saveSession(s,{role:'admin',name:'Daivik'},0);assert.equal(readSession(s,7*86400000),null);s.setItem(SESSION_KEY,'broken');assert.equal(readSession(s),null);saveSession(s,{role:'admin',name:'Unknown'});assert.equal(readSession(s),null)});
test('blocked storage fails gracefully',()=>{const s={getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}};assert.equal(readSession(s),null);assert.equal(saveSession(s,{}),false);assert.doesNotThrow(()=>clearSession(s))});
