process.env.TASK_SECRET='x'; process.env.RATE_LIMIT_MAX='100000';
const path=require('path'), http=require('http');
const BE = require('path').join(__dirname, '..', 'src');

let writes=[];
const dbPath=require.resolve(path.join(BE,'config/db.js'));
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql,params)=>{
  if(/COUNT\(\*\) FROM boards/i.test(sql)) return {rows:[{count:'0'}]};
  if(/SELECT id, role FROM users/i.test(sql)) return {rows:[]};
  if(/INSERT INTO boards|UPDATE users SET/i.test(sql)) writes.push(params);
  return {rows:[{id:'x'}]};
}}};
const authPath=require.resolve(path.join(BE,'middleware/auth.js'));
const fu={id:'u1',username:'t',avatar_url:null,role:'User'};
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{
  authenticateToken:(q,s,n)=>{q.user=fu;n();}, optionalAuth:(q,s,n)=>{q.user=fu;n();}, authenticateFirebase:(q,s,n)=>{q.user=fu;n();}}};

const app=require(path.join(BE,'app.js'));
let pass=0,fail=0;
const check=(n,c,e)=>{ if(c){pass++;console.log('  PASS  '+n);} else {fail++;console.log('  FAIL  '+n+(e!==undefined?'  got: '+e:''));} };

const server=app.listen(0,async()=>{
  const port=server.address().port;
  const send=(method,p,body)=>new Promise(r=>{
    const d=JSON.stringify(body);
    const rq=http.request({port,method,path:p,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d),'Authorization':'Bearer t'}},
      res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>r({status:res.statusCode,body:(()=>{try{return JSON.parse(b)}catch{return b}})()}))});
    rq.on('error',()=>r({status:0})); rq.write(d); rq.end();
  });
  const avatar=(v)=>send('PATCH','/api/users/me',{avatar_url:v});
  const board =(v)=>send('POST','/api/boards',{image_url:v});
  const realJpeg='data:image/jpeg;base64,'+'A'.repeat(200000);

  console.log('\n--- legitimate shapes must keep working ---');
  check('compressImage jpeg data URL (avatar)', (await avatar(realJpeg)).status===200);
  check('compressImage jpeg data URL (board)',  (await board(realJpeg)).status===201);
  // http(s) is rejected on user-writable paths. Signup still stores Google
  // picture URLs directly (authController), bypassing this validator.
  check('https URL now rejected',               (await avatar('https://cdn.example.com/a.png')).status===400);
  check('http URL now rejected',                (await avatar('http://example.com/a.png')).status===400);
  check('Google picture URL rejected via PATCH',(await avatar('https://lh3.googleusercontent.com/a/ACg8ocK_x=s96-c')).status===400);
  check('png data URL',                         (await avatar('data:image/png;base64,iVBORw0KGgo=')).status===200);
  check('webp data URL',                        (await avatar('data:image/webp;base64,UklGRg==')).status===200);
  check('gif data URL',                         (await avatar('data:image/gif;base64,R0lGODlh')).status===200);
  check('uppercase DATA:IMAGE/JPEG',            (await avatar('DATA:IMAGE/JPEG;base64,AAAA')).status===200);
  check('null clears avatar',                   (await avatar(null)).status===200);
  check('empty string clears avatar',           (await avatar('')).status===200);

  console.log('\n--- the finding: dangerous values now rejected ---');
  writes=[];
  check('javascript: scheme',        (await avatar('javascript:alert(1)')).status===400);
  check('JaVaScRiPt: mixed case',    (await avatar('JaVaScRiPt:alert(1)')).status===400);
  check('data:text/html',            (await avatar('data:text/html;base64,PHNjcmlwdD4=')).status===400);
  check('data:text/html plain',      (await avatar('data:text/html,<script>alert(1)</script>')).status===400);
  check('data:application/javascript',(await avatar('data:application/javascript;base64,YWxlcnQ=')).status===400);
  check('data:image/svg+xml (scriptable)', (await avatar('data:image/svg+xml;base64,PHN2Zz4=')).status===400);
  check('file:///etc/passwd',        (await avatar('file:///etc/passwd')).status===400);
  check('gopher://',                 (await avatar('gopher://evil.test/1')).status===400);
  check('vbscript:',                 (await avatar('vbscript:msgbox(1)')).status===400);
  check('arbitrary text',            (await avatar('just some text')).status===400);
  check('SSRF: internal metadata IP rejected',   (await avatar('http://169.254.169.254/latest/meta-data/')).status===400);
  check('SSRF: localhost rejected',              (await avatar('http://127.0.0.1:8080/admin')).status===400);
  check('tracking pixel URL rejected',           (await avatar('http://attacker.test/px.png')).status===400);
  check('protocol-relative URL rejected',        (await avatar('//attacker.test/px.png')).status===400);
  check('nothing written for rejects', writes.length<=1, writes.length);

  console.log('\n--- board image_url gets the same treatment ---');
  check('board javascript: rejected', (await board('javascript:alert(1)')).status===400);
  check('board data:text/html rejected', (await board('data:text/html,<b>')).status===400);
  check('board missing image_url -> 400', (await send('POST','/api/boards',{caption:'hi'})).status===400);

  console.log('\n--- banner_url too ---');
  check('banner data URL ok',   (await send('PATCH','/api/users/me',{banner_url:realJpeg})).status===200);
  check('banner javascript: rejected', (await send('PATCH','/api/users/me',{banner_url:'javascript:alert(1)'})).status===400);

  console.log('\n--- other fields unaffected ---');
  check('bio-only patch still works', (await send('PATCH','/api/users/me',{bio:'hello'})).status===200);
  check('username-only patch works',  (await send('PATCH','/api/users/me',{username:'newname'})).status===200);

  console.log('\n'+pass+' passed, '+fail+' failed');
  server.close(()=>process.exit(fail?1:0));
});
