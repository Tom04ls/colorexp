import {validateState} from './core.js';
export function mergeResume(remote,local){
 validateState(remote);
 if(!local||local.sessionId!==remote.sessionId)return remote;
 validateState(local);
 if(local.subjectId!==remote.subjectId||local.age!==remote.age)throw Error('Session identity mismatch');
 const merged=structuredClone(remote);
 merged.blocks.forEach((block,i)=>{
  const previous=local.blocks[i];
  if(block.taste!==previous.taste||JSON.stringify(block.order)!==JSON.stringify(previous.order))throw Error('Session plan mismatch');
  if(block.ack){if(previous.payload&&JSON.stringify(previous.payload)!==JSON.stringify(block.payload))throw Error('Saved data conflicts with local answers');}
  else merged.blocks[i]=structuredClone(previous);
 });
 if(remote.practiceComplete!==undefined||local.practiceComplete!==undefined)merged.practiceComplete=remote.practiceComplete||local.practiceComplete;
 if(local.practiceScores||remote.practiceScores)merged.practiceScores=local.practiceScores||remote.practiceScores;
 validateState(merged);return merged;
}
