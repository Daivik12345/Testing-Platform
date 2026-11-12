import test from 'node:test';
import assert from 'node:assert/strict';
import {hasCompleteAnswerKey,matchesQuestionFilter} from '../src/practice.js';
test('publishing rejects incomplete or invalid answer keys',()=>{
 assert.equal(hasCompleteAnswerKey(2,{1:'A'}),false);
 assert.equal(hasCompleteAnswerKey(2,{1:'A',2:''}),false);
 assert.equal(hasCompleteAnswerKey(2,{1:'A',2:'E'}),false);
 assert.equal(hasCompleteAnswerKey(2,{1:'A',2:'D'}),true);
});
test('unanswered filter includes marked but unanswered questions',()=>{
 assert.equal(matchesQuestionFilter('unanswered',undefined,'marked'),true);
 assert.equal(matchesQuestionFilter('unanswered','B','marked-answered'),false);
});
test('review filter includes both answered and unanswered review flags',()=>{
 assert.equal(matchesQuestionFilter('review','A','marked-answered'),true);
 assert.equal(matchesQuestionFilter('review',undefined,'marked'),true);
 assert.equal(matchesQuestionFilter('review','A','answered'),false);
});
