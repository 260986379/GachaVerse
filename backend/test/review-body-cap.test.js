process.env.TASK_SECRET='x'; process.env.RATE_LIMIT_MAX='100000';
const path=require('path'), http=require('http');
const BE = require('path').join(__dirname, '..', 'src');
let writes=[];
const dbPath=require.resolve(path.join(BE,'config/db.js'));
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async(sql,params)=>{
  if(/INSERT INTO game_reviews/i.test(sql)){ writes.push(params); return {rows:[{id:'r1',rating:params[2],body:params[3],inserted:true}]}; }
  return {rows:[{total:0,total_upvotes:0}]};
}}};
const authPath=require.resolve(path.join(BE,'middleware/auth.js'));
const fu={id:'u1',username:'t',role:'User'};
require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{
  authenticateToken:(q,s,n)=>{q.user=fu;n();}, optionalAuth:(q,s,n)=>{q.user=fu;n();}, authenticateFirebase:(q,s,n)=>{q.user=fu;n();}}};

const app=require(path.join(BE,'app.js'));
let pass=0,fail=0;
const check=(n,c,e)=>{ if(c){pass++;console.log('  PASS  '+n);} else {fail++;console.log('  FAIL  '+n+(e!==undefined?'  got: '+e:''));} };

const server=app.listen(0,async()=>{
  const port=server.address().port;
  const post=(b)=>new Promise(r=>{
    const d=JSON.stringify(b);
    const rq=http.request({port,method:'POST',path:'/api/reviews/zzz',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d),'Authorization':'Bearer t'}},
      res=>{let x='';res.on('data',c=>x+=c);res.on('end',()=>r({status:res.statusCode,body:(()=>{try{return JSON.parse(x)}catch{return x}})()}))});
    rq.on('error',()=>r({status:0})); rq.write(d); rq.end();
  });

  console.log('\n--- body capped at 500 ---');
  check('body 500 accepted',        (await post({rating:8,body:'a'.repeat(500)})).status===201);
  let r=await post({rating:8,body:'a'.repeat(501)});
  check('body 501 rejected',        r.status===400, r.status);
  check('  -> message names the cap', /500 characters/.test(r.body?.message||''), r.body?.message);
  writes=[];
  check('1000 chars (old UI cap) rejected', (await post({rating:8,body:'a'.repeat(1000)})).status===400);
  check('5000 chars rejected',      (await post({rating:8,body:'a'.repeat(5000)})).status===400);
  check('1MB body rejected',        (await post({rating:8,body:'a'.repeat(1000000)})).status===400);
  check('  -> nothing written',     writes.length===0, writes.length);

  console.log('\n--- body stays optional ---');
  check('body omitted -> 201',      (await post({rating:8})).status===201);
  check('empty body -> 201',        (await post({rating:8,body:''})).status===201);
  check('null body -> 201',         (await post({rating:8,body:null})).status===201);

  console.log('\n--- rating validation preserved ---');
  check('rating 1 ok',   (await post({rating:1})).status===201);
  check('rating 10 ok',  (await post({rating:10})).status===201);
  check('rating 0 -> 400',  (await post({rating:0})).status===400);
  check('rating 11 -> 400', (await post({rating:11})).status===400);
  check('rating -3 -> 400', (await post({rating:-3})).status===400);
  check('rating missing -> 400', (await post({body:'x'})).status===400);
  check('rating non-numeric -> 400', (await post({rating:'abc'})).status===400);
  check('rating 7.5 -> 400', (await post({rating:7.5})).status===400);
  r=await post({rating:0});
  check('  -> rating message preserved', /Rating must be between 1 and 10/.test(r.body?.message||''), r.body?.message);
  check('numeric string rating "8" accepted', (await post({rating:'8'})).status===201);

  console.log('\n--- stored value is trimmed ---');
  writes=[];
  await post({rating:8,body:'  hello  '});
  check('body trimmed before insert', writes[0] && writes[0][3]==='hello', JSON.stringify(writes[0]?.[3]));

  console.log('\n'+pass+' passed, '+fail+' failed');
  server.close(()=>process.exit(fail?1:0));
});
