// 后台管理脚本：在 admin.html 中使用 GitHub REST API 写入文件
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

document.getElementById('btn-auth').addEventListener('click', async ()=>{
  token = document.getElementById('input-token').value.trim();
  if(!token) return alert('请输入 GitHub Token');
  try{
    const me = await api('/user');
    document.getElementById('auth-result').textContent = `已登录为 ${me.login}`;
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

async function uploadImage(file, pathPrefix='images'){
  if(!file) return null;
  const name = Date.now() + '-' + slugify(file.name);
  const path = `${pathPrefix}/${name}`;
  const data = await new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result.split(',')[1]);

