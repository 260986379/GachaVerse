process.env.TASK_SECRET='x'; process.env.RATE_LIMIT_MAX='100000';
const path=require('path'), http=require('http');
const BE = require('path').join(__dirname, '..', 'src');

let writes=[];
const dbPath=require.resolve(path.join(BE,'config/db.js'));
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql,params)=>{
  if(/COUNT\(\*\) FROM boards/i.test(sql)) return {rows:[{count:'0'}]};
  if(/SELECT id, role FROM users/i.test(sql)) return {rows:[]};
  if(/INSERT INTO boards|INSERT INTO board_comments|UPDATE users SET/i.test(sql)){ writes.push({sql:sql.replace(/\s+/g,' ').trim(),params}); }
  return {rows:[{id:'x',caption:'c',text:'t',created_at:'now'}]};
}}};

// Stub auth: treat any Bearer token as a logged-in user.
const authPath=require.resolve(path.join(BE,'middleware/auth.js'));
const fakeUser={id:'user-1',username:'tester',avatar_url:null,role:'User',firebase_uid:'fbTester'};
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{
  authenticateToken:(req,res,next)=>{ req.user=fakeUser; next(); },
  optionalAuth:(req,res,next)=>{ req.user=fakeUser; next(); },
  authenticateFirebase:(req,res,next)=>{ req.user=fakeUser; next(); },
}};

// Replacing/removing images would delete stored files; never touch the bucket here.
const sfPath=require.resolve(path.join(BE,'services/storageFiles.js'));
require.cache[sfPath]={id:sfPath,filename:sfPath,loaded:true,exports:{deleteImageByUrl:async()=>{},deletePrefix:async()=>{},deleteObject:async()=>{}}};

const app=require(path.join(BE,'app.js'));
let pass=0,fail=0;
const check=(n,c,e)=>{ if(c){pass++;console.log('  PASS  '+n);} else {fail++;console.log('  FAIL  '+n+(e!==undefined?'\n        got: '+e:''));} };

const server=app.listen(0,async()=>{
  const port=server.address().port;
  const send=(method,p,body)=>new Promise(r=>{
    const d=JSON.stringify(body);
    const rq=http.request({port,method,path:p,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d),'Authorization':'Bearer t'}},
      res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>r({status:res.statusCode,body:(()=>{try{return JSON.parse(b)}catch{return b}})()}))});
    rq.on('error',()=>r({status:0})); rq.write(d); rq.end();
  });
  // Images are Storage URLs in the caller's own folder since #45.
  const su=(kind)=>`https://firebasestorage.googleapis.com/v0/b/gachaverse-497204.firebasestorage.app/o/${encodeURIComponent(`users/fbTester/${kind}/abc-123.jpg`)}?alt=media&token=t1`;
  const img=su('board');
  // Oversized bodies are now stopped by the 100kb request limit (413) before validation (400).
  const tooBig=(r)=>[400,413].includes(r.status);

  console.log('\n--- board caption: cap 500 ---');
  writes=[];
  check('caption 500 accepted', (await send('POST','/api/boards',{image_url:img,caption:'a'.repeat(500)})).status===201);
  check('caption 501 rejected',  (await send('POST','/api/boards',{image_url:img,caption:'a'.repeat(501)})).status===400);
  writes=[];
  const r1=await send('POST','/api/boards',{image_url:img,caption:'a'.repeat(1000000)});
  check('1M-char caption rejected', tooBig(r1), r1.status);
  check('  -> nothing written', writes.length===0, writes.length);
  check('empty caption still ok',  (await send('POST','/api/boards',{image_url:img,caption:''})).status===201);
  check('caption omitted still ok',(await send('POST','/api/boards',{image_url:img})).status===201);

  console.log('\n--- board comment text: cap 2000 ---');
  check('text 2000 accepted', (await send('POST','/api/boards/b1/comments',{text:'a'.repeat(2000)})).status===201);
  check('text 2001 rejected',  (await send('POST','/api/boards/b1/comments',{text:'a'.repeat(2001)})).status===400);
  writes=[];
  check('5MB text rejected',   tooBig(await send('POST','/api/boards/b1/comments',{text:'a'.repeat(5000000)})));
  check('  -> nothing written', writes.length===0, writes.length);
  check('empty text rejected',  (await send('POST','/api/boards/b1/comments',{text:''})).status===400);
  check('whitespace-only rejected',(await send('POST','/api/boards/b1/comments',{text:'   '})).status===400);

  console.log('\n--- bio: cap 500 (UI textarea is 300) ---');
  check('bio 300 (UI max) accepted', (await send('PATCH','/api/users/me',{bio:'a'.repeat(300)})).status===200);
  check('bio 500 accepted',          (await send('PATCH','/api/users/me',{bio:'a'.repeat(500)})).status===200);
  check('bio 501 rejected',          (await send('PATCH','/api/users/me',{bio:'a'.repeat(501)})).status===400);
  writes=[];
  check('2MB bio rejected',          tooBig(await send('PATCH','/api/users/me',{bio:'a'.repeat(2000000)})));
  check('  -> nothing written',      writes.length===0, writes.length);
  check('empty bio accepted (clears)',(await send('PATCH','/api/users/me',{bio:''})).status===200);
  check('null bio accepted (clears)', (await send('PATCH','/api/users/me',{bio:null})).status===200);

  console.log('\n--- request body limit: 100kb (was 10mb for inline images, #45) ---');
  writes=[];
  let rb=await send('PATCH','/api/users/me',{bio:'a'.repeat(150000)});
  check('150KB request -> 413', rb.status===413, rb.status);
  check('  -> nothing written', writes.length===0, writes.length);
  rb=await send('PATCH','/api/users/me',{bio:'a'.repeat(90000)});
  check('90KB request passes the limit, then hits the bio cap -> 400', rb.status===400, rb.status);

  console.log('\n--- existing flows must not break ---');
  check('username update works',        (await send('PATCH','/api/users/me',{username:'newname'})).status===200);
  check('username 30 (UI max) works',   (await send('PATCH','/api/users/me',{username:'a'.repeat(30)})).status===200);
  check('avatar Storage URL works',     (await send('PATCH','/api/users/me',{avatar_url:su('avatar')})).status===200);
  check('avatar null (remove) works',   (await send('PATCH','/api/users/me',{avatar_url:null})).status===200);
  check('banner Storage URL works',     (await send('PATCH','/api/users/me',{banner_url:su('banner')})).status===200);
  check('banner null (remove) works',   (await send('PATCH','/api/users/me',{banner_url:null})).status===200);
  check('board create with all fields', (await send('POST','/api/boards',{game_id:'g1',game_name:'NIKKE',image_url:img,caption:'hi'})).status===201);

  console.log('\n--- partial-update semantics preserved ---');
  writes=[];
  await send('PATCH','/api/users/me',{bio:'only bio'});
  const sql=writes[0]?.sql||'';
  check('only bio in SET clause', /SET bio =/.test(sql) && !/username =/.test(sql) && !/avatar_url =/.test(sql), sql);
  check('empty body still 400',   (await send('PATCH','/api/users/me',{})).status===400);

  console.log('\n'+pass+' passed, '+fail+' failed');
  server.close(()=>process.exit(fail?1:0));
});
