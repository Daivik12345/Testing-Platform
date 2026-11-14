import test from 'node:test';
import assert from 'node:assert/strict';
import { bounded, parseAnswerKey, publishError } from '../src/publishing.js';
test('imports keys and rejects invalid or out-of-range answers',()=>{
 assert.deepEqual(parseAnswerKey('{"1":"A","2":"D"}',2),{'1':'A','2':'D'});
 for(const input of ['null','[]','{}','{"0":"A"}','{"3":"A"}','{"1":"E"}','{"01":"B"}'])assert.throws(()=>parseAnswerKey(input,2));
});
test('publishing timeout settles instead of leaving UI waiting',async()=>{
 await assert.rejects(bounded(new Promise(()=>{}),10),/did not confirm/);
 assert.equal(await bounded(Promise.resolve('saved'),50),'saved');
 await assert.rejects(bounded(Promise.reject(new Error('denied')),50),/denied/);
});
test('actionable permission and storage errors',()=>{
 assert.match(publishError({code:'permission-denied'}),/rules/);
 assert.match(publishError({code:'storage/bucket-not-found'}),/Storage/);
});
