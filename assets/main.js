// 站点前端逻辑（已根据 config.json 填写）
(async function(){
  const cfgUrl = './config.json';
  let cfg = {};
  try{
    cfg = await fetch(cfgUrl).then(r=>r.ok? r.json() : {});
  }catch(e){
    console.warn('无法加载 config.json', e);
  }

  // 背景
  if(cfg.background){
    if(cfg.background.type === 'color') document.documentElement.style.setProperty('--bg-color', cfg.background.value || '#07102a');
    if(cfg.background.type === 'image') document.documentElement.style.setProperty('--bg-image', `url(${cfg.background.value})`);
  }

  document.getElementById('site-title').textContent = cfg.title || '筑云小��';
  document.getElementById('site-subtitle').textContent = cfg.subtitle || '';
  document.getElementById('owner-name').textContent = cfg.owner_text || cfg.owner || '';

  // 站点存在时间或自定义文本
  const ageEl = document.getElementById('site-age');
  if(cfg.custom_age_text){
    ageEl.textContent = cfg.custom_age_text;
  }else if(cfg.start_date){
    const start = new Date(cfg.start_date);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear() - (now < new Date(now.getFullYear(), start.getMonth(), start.getDate()) ? 1 : 0);
    ageEl.textContent = `本网站已稳定存在 ${years} 年（始于 ${start.getFullYear()}）`;
  }

  // 加载文章索引
  let articles = [];
  async function loadIndex(){
    try{
      const idxUrl = cfg.index_json_raw || './articles/index.json';
      const res = await fetch(idxUrl);
      if(!res.ok) throw new Error('index not found');
      const text = await res.text();
      articles = JSON.parse(text);
    }catch(e){
      console.warn('无法加载文章索引 index.json:', e);
      articles = [];
    }
  }
  await loadIndex();

  const container = document.getElementById('articles');
  function renderList(){
    container.innerHTML = '';
    if(articles.length===0){
      container.innerHTML = '<p>目前没有文章。你可以在后台 admin.html 上传文章。</p>';
      return;
    }
    articles.sort((a,b)=> (new Date(b.date) - new Date(a.date)));
    articles.forEach(a=>{
      const el = document.createElement('article');
      el.className='article';
      el.innerHTML = `
        <h2>${a.title}</h2>
        <div class="meta">${a.date ? a.date.split('T')[0] : ''} ${a.author ? ' · ' + a.author : ''}</div>
        <div class="excerpt" data-path="${a.path || a.file}">${a.excerpt || ''}</div>
        <button data-path="${a.path || a.file}" class="btn-read">阅读全文</button>
      `;
      container.appendChild(el);
    });
  }
  renderList();

  container.addEventListener('click', async (ev)=>{
    if(ev.target.matches('.btn-read')){
      const path = ev.target.getAttribute('data-path');
      if(!path) return;
      try{
        const rawUrl = (cfg.raw_base || '') + '/' + path;
        const res = await fetch(rawUrl);
        if(!res.ok) throw new Error('无法获取文章：'+res.status);
        let body = await res.text();
        if(body.startsWith('ENC[AES]')){
          const pwd = prompt('此文章已加密，请输入解密密码：');
          if(!pwd) return alert('未输入密码');
          try{
            const b64 = body.replace(/^ENC\[AES\]/,'');
            const bytes = CryptoJS.AES.decrypt(b64, pwd);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            if(!decrypted) throw new Error('解密失败');
            body = decrypted;
          }catch(e){
            return alert('解密失败：密码错误或内容损坏');
          }
        }
        const html = marked.parse(body);
        const win = window.open('', '_blank');
        win.document.write(`<meta charset="utf-8"><title>${path}</title><style>body{font-family:system-ui;padding:24px;line-height:1.7;color:#111}</style>${html}`);
      }catch(e){
        alert('加载文章失败: '+e.message);
      }
    }
  });

  // Giscus 评论（如果配置了 repo）
  if(cfg.giscus && cfg.giscus.repo){
    const c = document.getElementById('comments-container');
    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.setAttribute('data-repo', cfg.giscus.repo);
    if(cfg.giscus.mapping) s.setAttribute('data-mapping', cfg.giscus.mapping);
    s.setAttribute('data-reactions-enabled', cfg.giscus.reactions || '1');
    s.setAttribute('data-emit-metadata', '0');
    s.setAttribute('crossorigin','anonymous');
    s.setAttribute('async','');
    c.appendChild(s);
  }

  document.getElementById('footer-year').textContent = new Date().getFullYear();
})();