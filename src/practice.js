export function hasCompleteAnswerKey(totalQuestions, answerKey) {
  return Number.isInteger(totalQuestions) && totalQuestions > 0 &&
    Array.from({length:totalQuestions},(_,i)=>i+1).every(q=>['A','B','C','D'].includes(answerKey?.[q]));
}
export function matchesQuestionFilter(filter, response, status) {
  return filter === 'unanswered' ? !response : filter === 'review' ? (status || '').includes('marked') : true;
}
