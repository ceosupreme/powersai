import {it} from 'node:test';import assert from 'node:assert/strict';
import {postingCaptions} from '../../supabase/functions/brand-drive/captions';
it('copies explicit platform captions, not file names, AI notes or scheduling instructions',()=>{
 const text='Already scheduled: check it first.\nFACEBOOK - 12:30 PM Pacific\nFile: fb.png\nCaption (paste):\nMeasure, do not guess.\nHashtags: none on Facebook.\nAI label: off.\nINSTAGRAM - 12:00 PM Pacific\nFile: ig.png\nCaption (paste):\nStart with measurements.\n#BigPawsClub\nAI label: off.\nPhoto credits: none.';
 assert.deepEqual(postingCaptions(text),[{channel:'facebook',caption:'Measure, do not guess.'},{channel:'instagram',caption:'Start with measurements.\n#BigPawsClub'}]);
});
it('does not infer platforms from unstructured markdown',()=>assert.deepEqual(postingCaptions('A nice photo. Here is your caption.'),[]));
