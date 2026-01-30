// 后台逻辑：使用 GitHub REST API (v3) 上传文章与图片、更新 config.json 或 index.json
// 使用方法：打开 admin.html，输入 PAT（token），页面会用该 token 调用 API 写入仓库

let token = '';
let cfg = null;

async function loadLocalConfig(){
  try{
    cfg = await fetch('./config.json').then(r=>r.ok? r.json() : {});
    document.getElementById('config-editor').value = JSON.stringify(cfg, null, 2);
  }catch(e){
    cfg = {};
    document.getElementById('config-editor').value = '{}';
  }
}

async function api(path, opts={}){
  const base = 'https://api.github.com';
  const headers = opts.headers || {};
  headers['Authorization'] = 'token ' + token;
  headers['Accept'] = 'application/vnd.github.v3+json';
  opts.headers = headers;
  const res = await fetch(base + path, opts);
  if(!res.ok){
    const t = await res.text();
    throw new Error(res.status + ' ' + res.statusText + ' ' + t);
  }
  return res.json();
}

// 验证 Token 并读取仓库基本信息
document.getElementById('btn-auth').addEventListener('click', async ()=>{
  token = document.getElementById('input-token').value.trim();
  if(!token) return alert('请输入 GitHub Token');
  try{
    const me = await api('/user');
    document.getElementById('auth-result').textContent = `已登录为 ${me.login}`;
    // 加载 config.json
    await loadLocalConfig();
    document.getElementById('create-article').classList.remove('hidden');
    document.getElementById('site-config').classList.remove('hidden');
  }catch(e){
    document.getElementById('auth-result').textContent = 'Token 无效或网络错误：'+e.message;
    console.error(e);
  }
});

document.getElementById('article-encrypt').addEventListener('change', (e)=>{
  document.getElementById('password-label').classList.toggle('hidden', !e.target.checked);
});

function slugify(s){
  return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

// 上传图片：把图片转为 base64 并创建仓库文件 images/{filename}
async function uploadImage(file, pathPrefix='images'){
  if(!file) return null;
  const name = Date.now() + '-' + slugify(file.name);
  const path = `${pathPrefix}/${name}`;
  const data = await new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result.split(',')[1]); // base64
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const message = `Upload image ${name}`;
  const body = {
    message,
    content: data,
  };
  // PUT /repos/{owner}/{repo}/contents/{path}
  const owner = cfg.owner;
  const repo = cfg.repo;
  if(!owner || !repo) throw new Error('请在 config.json 中设置 owner 与 repo');
  const resp = await api(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  // 返回 raw URL
  const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${resp.content?.sha ? resp.content.name : 'HEAD'}/${path}`;
  // 更可靠的 raw URL（使用 branch/main）
  const branch = cfg.branch || 'main';
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

// 发布文章：创建 articles/{dir}/{slug}.md
document.getElementById('btn-publish').addEventListener('click', async ()=>{
  const title = document.getElementById('article-title').value.trim();
  const dir = document.getElementById('article-dir').value.trim() || 'articles';
  const slug = document.getElementById('article-slug').value.trim() || slugify(title);
  const encrypt = document.getElementById('article-encrypt').checked;
  const password = document.getElementById('article-password').value;
  const content = document.getElementById('article-content').value;
  const fileInput = document.getElementById('image-file');
  if(!title || !content) return alert('请填写标题和内容');

  try{
    // 上传图片（如果有）
    let imageUrl = null;
    if(fileInput.files && fileInput.files[0]){
      document.getElementById('publish-result').textContent = '正在上传图片...';
      imageUrl = await uploadImage(fileInput.files[0], cfg.images_dir || 'images');
    }

    let bodyText = content;
    if(encrypt){
      if(!password) return alert('请选择加密并填写密码');
      const encrypted = CryptoJS.AES.encrypt(bodyText, password).toString();
      // 我们在文件开头写标记 ENC[AES] + base64cipher
      bodyText = 'ENC[AES]' + encrypted;
    }

    // 前置 YAML frontmatter（可选）
    const fm = `---\ntitle: "${title}"\ndate: "${new Date().toISOString()}"\nimage: "${imageUrl || ''}"\n---\n\n`;
    const md = fm + bodyText;

    // PUT file via GitHub API
    const owner = cfg.owner;
    const repo = cfg.repo;
    const branch = cfg.branch || 'main';
    if(!owner || !repo) throw new Error('请在 config.json 中设置 owner 与 repo');

    const path = `${dir.replace(/\/$/,'')}/${slug}.md`;
    const encoded = btoa(unescape(encodeURIComponent(md)));
    const message = `Create article ${slug}`;

    document.getElementById('publish-result').textContent = '正在创建文章...';

    const resp = await api(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: encoded,
        branch,
      })
    });

    // 更新或创建 articles/index.json（如果你使用 index.json 来做索引）
    // 先尝试读取现有 index.json
    const indexPath = cfg.index_json_path || 'articles/index.json';
    let indexExists = true;
    let indexSha = null;
    let indexData = [];
    try{
      const cur = await api(`/repos/${owner}/${repo}/contents/${encodeURIComponent(indexPath)}?ref=${branch}`);
      indexSha = cur.sha;
      const raw = atob(cur.content);
      indexData = JSON.parse(raw);
    }catch(e){
      indexExists = false;
      indexData = [];
    }

    // 新条目
    const entry = {
      title,
      date: new Date().toISOString(),
      file: path,
      path,
      excerpt: content.slice(0,200).replace(/\n/g,' '),
      author: cfg.owner || '',
    };
    indexData.push(entry);
    const newIndexContent = btoa(unescape(encodeURIComponent(JSON.stringify(indexData, null, 2))));

    const putBody = {
      message: indexExists ? `Update index ${indexPath}` : `Create index ${indexPath}`,
      content: newIndexContent,
      branch,
    };
    if(indexExists) putBody.sha = indexSha;

    await api(`/repos/${owner}/${repo}/contents/${encodeURIComponent(indexPath)}`, {
      method: 'PUT',
      body: JSON.stringify(putBody)
    });

    document.getElementById('publish-result').textContent = '发布成功！';
  }catch(e){
    document.getElementById('publish-result').textContent = '发布失败：'+e.message;
    console.error(e);
  }
});

// 保存 config.json 到仓库
document.getElementById('btn-save-config').addEventListener('click', async ()=>{
  const txt = document.getElementById('config-editor').value;
  try{
    const parsed = JSON.parse(txt);
    cfg = parsed;
  }catch(e){
    return alert('config.json 格式错误：'+e.message);
  }
  // PUT to repo
  const owner = cfg.owner;
  const repo = cfg.repo;
  const branch = cfg.branch || 'main';
  if(!owner || !repo) return alert('请在 config 中设置 owner 与 repo');
  // 先获取是否已存在
  try{
    const cur = await api(`/repos/${owner}/${repo}/contents/config.json?ref=${branch}`);
    const sha = cur.sha;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(cfg, null, 2))));
    await api(`/repos/${owner}/${repo}/contents/config.json`, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Update config.json',
        content: encoded,
        sha,
        branch
      })
    });
    document.getElementById('config-result').textContent = 'config.json 已保存到仓库';
  }catch(e){
    // 如果不存在则创建
    try{
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(cfg, null, 2))));
      await api(`/repos/${owner}/${repo}/contents/config.json`, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'Create config.json',
          content: encoded,
          branch
        })
      });
      document.getElementById('config-result').textContent = 'config.json 已创建';
    }catch(err){
      document.getElementById('config-result').textContent = '保存失败：'+err.message;
      console.error(err);
    }
  }
});

loadLocalConfig().catch(()=>{});