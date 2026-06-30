import { requireAuth } from '../auth.js';
import { adminShell, adminTabs } from './admin-common.js';
import { supabase } from '../supabase.js';
import { qs, toast } from '../ui.js';

const me = await requireAuth({ admin: true });
if (me) init();

async function init() {
  await adminShell('admin-settings.html');
  qs('#main').innerHTML = `
    ${adminTabs('admin-settings.html')}
    <div class="page-head fade-up"><h1>Settings</h1><p>Broadcast announcements to all members</p></div>
    <div class="glass card fade-up" style="max-width:560px">
      <h3>Send announcement</h3>
      <div class="stack" style="margin-top:14px">
        <div class="field"><label>Title</label><input class="input" id="a-title" placeholder="Season update"></div>
        <div class="field"><label>Message</label><textarea class="textarea" id="a-body"></textarea></div>
        <button class="btn btn-primary" id="send">Send to everyone</button>
      </div>
    </div>`;
  qs('#send').addEventListener('click', async () => {
    const title = qs('#a-title').value.trim();
    if (!title) return toast('Title required','error');
    try {
      const { error } = await supabase.rpc('notify_all', { p_title: title, p_body: qs('#a-body').value.trim(), p_type: 'info' });
      if (error) throw error;
      toast('Announcement sent'); qs('#a-title').value=''; qs('#a-body').value='';
    } catch (err) { toast(err.message||'Failed','error'); }
  });
}
