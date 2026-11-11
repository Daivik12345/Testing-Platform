import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreAttempt } from '../src/scoring.js';
const paper={totalQuestions:4,answerKey:{1:'A',2:'B',3:'C',4:'D'}};
test('scores correct, wrong and skipped answers including the last question',()=>{
 assert.deepEqual(scoreAttempt(paper,{1:'A',2:'A',4:'D'}),{totalQs:4,correct:2,incorrect:1,unattempted:1,totalScore:7});
});
test('empty attempts score zero',()=>assert.equal(scoreAttempt(paper,{}).totalScore,0));
test('all wrong answers produce a negative score',()=>assert.equal(scoreAttempt(paper,{1:'D',2:'D',3:'D',4:'A'}).totalScore,-4));
test('responses outside the paper are ignored',()=>assert.equal(scoreAttempt(paper,{5:'A'}).unattempted,4));
