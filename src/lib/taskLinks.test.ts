import { describe, it, expect } from 'vitest';
import { taskLinks } from '@/lib/ownerWork';
describe('taskLinks', () => {
  it('finds saved, written and tool links', () => {
    const l = taskLinks({ title: 'Set up the pipeline in GoHighLevel', detail: 'Read https://docs.google.com/document/d/abc/edit (dated). Then go.', facts: '{"method":"youtube","links":{"brief":"https://example.com/b"}}', projectId: 'p1', jobId: 'j1', stepId: 's1' });
    console.log(l);
    expect(l.map(x=>x.url)).toEqual(['https://example.com/b','https://docs.google.com/document/d/abc/edit','https://app.gohighlevel.com/','https://studio.youtube.com/','/project/p1/jobs/j1?step=s1']);
  });
  it('falls back to brand', () => { expect(taskLinks({ title: 'x', projectId: 'p' })[0].url).toBe('/project/p'); });
});
