/** NEET-style scoring: +4 correct, -1 incorrect, 0 unanswered. */
export function scoreAttempt(test, responses) {
  let correct=0, incorrect=0, unattempted=0;
  for(let q=1;q<=test.totalQuestions;q++) {
    if(!responses[q]) unattempted++;
    else if(responses[q]===test.answerKey[q]) correct++;
    else incorrect++;
  }
  return {totalQs:test.totalQuestions,correct,incorrect,unattempted,totalScore:correct*4-incorrect};
}
