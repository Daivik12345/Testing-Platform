import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestions,validQuestions } from '../src/questionParser.js';
const lines=text=>text.split('\n').map((text,i)=>({text,y:20+i*15}));
test('extracts question text, options, and original PDF coordinates',()=>{
 const qs=parseQuestions([{page:1,lines:lines('1. First stem\ncontinued\nA. Alpha\nB. Beta\nC. Gamma\nD. Delta\n2. Second stem\n(A) One\n(B) Two\n(C) Three\n(D) Four')}]);
 assert.equal(qs[0].text,'First stem continued');assert.equal(qs[1].options.D,'Four');assert.equal(qs[0].end.page,1);assert.ok(validQuestions(qs,2));
});
test('incomplete or scanned imports cannot be published as structured questions',()=>{
 assert.equal(validQuestions(parseQuestions([{page:1,lines:[]}]),90),false);
 const qs=parseQuestions([{page:1,lines:lines('1. Stem\nA. One\nB. Two')}]);assert.equal(validQuestions(qs,1),false);
});
test('preserves wrapped options across pages',()=>{
 const qs=parseQuestions([{page:1,lines:lines('1. Stem\nA. One')},{page:2,lines:lines('continued\nB. Two\nC. Three\nD. Four')}]);assert.equal(qs[0].options.A,'One continued');assert.equal(qs[0].end.page,2);
});
