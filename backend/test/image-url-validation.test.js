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
const fu={id:'u1',username:'t',avatar_url:null,role:'User',firebase_uid:'fbUser1'};
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{
  authenticateToken:(q,s,n)=>{q.user=fu;n();}, optionalAuth:(q,s,n)=>{q.user=fu;n();}, authenticateFirebase:(q,s,n)=>{q.user=fu;n();}}};

// Storage deletes are covered by storage-cleanup; never touch the bucket here.
const sfPath=require.resolve(path.join(BE,'services/storageFiles.js'));
require.cache[sfPath]={id:sfPath,filename:sfPath,loaded:true,exports:{deleteImageByUrl:async()=>{},deletePrefix:async()=>{},deleteObject:async()=>{}}};

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
  const smallJpeg='data:image/jpeg;base64,'+'A'.repeat(20000);

  console.log('\n--- inline data URLs are no longer accepted (#45: images live in Storage) ---');
  check('jpeg data URL (avatar) rejected', (await avatar(smallJpeg)).status===400);
  check('jpeg data URL (board) rejected',  (await board(smallJpeg)).status===400);
  // http(s) is rejected on user-writable paths. Signup still stores Google
  // picture URLs directly (authController), bypassing this validator.
  check('https URL now rejected',               (await avatar('https://cdn.example.com/a.png')).status===400);
  check('http URL now rejected',                (await avatar('http://example.com/a.png')).status===400);
  check('Google picture URL rejected via PATCH',(await avatar('https://lh3.googleusercontent.com/a/ACg8ocK_x=s96-c')).status===400);
  check('png data URL rejected',                (await avatar('data:image/png;base64,iVBORw0KGgo=')).status===400);
  check('webp data URL rejected',               (await avatar('data:image/webp;base64,UklGRg==')).status===400);
  check('gif data URL rejected',                (await avatar('data:image/gif;base64,R0lGODlh')).status===400);
  check('uppercase DATA:IMAGE/JPEG rejected',   (await avatar('DATA:IMAGE/JPEG;base64,AAAA')).status===400);
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
  check('banner data URL rejected', (await send('PATCH','/api/users/me',{banner_url:smallJpeg})).status===400);
  check('banner javascript: rejected', (await send('PATCH','/api/users/me',{banner_url:'javascript:alert(1)'})).status===400);

  console.log('\n--- Firebase Storage URLs (#45): own folder only ---');
  const B='gachaverse-497204.firebasestorage.app';
  const su=(name, q='alt=media&token=0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0', bucket=B, host='firebasestorage.googleapis.com')=>
    `https://${host}/v0/b/${bucket}/o/${encodeURIComponent(name)}${q===null?'':'?'+q}`;
  const banner=(v)=>send('PATCH','/api/users/me',{banner_url:v});
  check('own avatar file accepted',            (await avatar(su('users/fbUser1/avatar/3f2a9c1e-aaaa-4bbb-8ccc-123456789abc.jpg'))).status===200);
  check('own banner file accepted',            (await banner(su('users/fbUser1/banner/abc-123.jpg'))).status===200);
  check('own board file accepted',             (await board(su('users/fbUser1/board/abc-123.jpg'))).status===201);
  check("another user's file rejected",        (await avatar(su('users/fbOther/avatar/abc-123.jpg'))).status===400);
  check('uid prefix trick rejected (fbUser10)',(await avatar(su('users/fbUser10/avatar/abc-123.jpg'))).status===400);
  check('wrong folder for field rejected (board file as avatar)', (await avatar(su('users/fbUser1/board/abc-123.jpg'))).status===400);
  check('avatar file as board rejected',       (await board(su('users/fbUser1/avatar/abc-123.jpg'))).status===400);
  check('other bucket rejected',               (await avatar(su('users/fbUser1/avatar/abc-123.jpg', undefined, 'evil-bucket.appspot.com'))).status===400);
  check('lookalike host rejected',             (await avatar(su('users/fbUser1/avatar/abc-123.jpg', undefined, B, 'firebasestorage.googleapis.com.evil.test'))).status===400);
  check('storage.googleapis.com form rejected',(await avatar(`https://storage.googleapis.com/${B}/users/fbUser1/avatar/abc-123.jpg`)).status===400);
  check('http:// rejected',                    (await avatar(su('users/fbUser1/avatar/abc-123.jpg').replace('https:','http:'))).status===400);
  check('path traversal (..) rejected',        (await avatar(su('users/fbUser1/avatar/../../fbOther/avatar/x.jpg'))).status===400);
  check('unencoded path (raw slashes) rejected',(await avatar(`https://firebasestorage.googleapis.com/v0/b/${B}/o/users/fbUser1/avatar/abc-123.jpg?alt=media&token=t1`)).status===400);
  check('svg extension rejected',              (await avatar(su('users/fbUser1/avatar/abc-123.svg'))).status===400);
  check('missing token rejected',              (await avatar(su('users/fbUser1/avatar/abc-123.jpg','alt=media'))).status===400);
  check('no query string rejected',            (await avatar(su('users/fbUser1/avatar/abc-123.jpg',null))).status===400);
  check('extra query param rejected',          (await avatar(su('users/fbUser1/avatar/abc-123.jpg','alt=media&token=t1&x=1'))).status===400);
  check('userinfo in URL rejected',            (await avatar(su('users/fbUser1/avatar/abc-123.jpg').replace('https://','https://a:b@'))).status===400);
  check('fragment rejected',                   (await avatar(su('users/fbUser1/avatar/abc-123.jpg')+'#x')).status===400);
  check('very long URL rejected',              (await avatar(su('users/fbUser1/avatar/abc-123.jpg','alt=media&token='+'a'.repeat(600)))).status===400);

  console.log('\n--- other fields unaffected ---');
  check('bio-only patch still works', (await send('PATCH','/api/users/me',{bio:'hello'})).status===200);
  check('username-only patch works',  (await send('PATCH','/api/users/me',{username:'newname'})).status===200);

  console.log('\n'+pass+' passed, '+fail+' failed');
  server.close(()=>process.exit(fail?1:0));
});
